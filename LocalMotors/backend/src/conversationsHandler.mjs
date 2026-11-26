import { createHash, randomUUID } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  BatchGetCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { publishEventToUser } from './websocketPublisher.mjs';

const VEHICLES_TABLE_NAME = process.env.VEHICLES_TABLE_NAME || process.env.VEHICLES_TABLE;
const CONVERSATIONS_TABLE_NAME =
  process.env.CONVERSATIONS_TABLE_NAME || process.env.CONVERSATIONS_TABLE;
const MESSAGES_TABLE_NAME = process.env.MESSAGES_TABLE_NAME || process.env.MESSAGES_TABLE;
const BUYER_INDEX = process.env.CONVERSATIONS_BUYER_INDEX || 'buyerId-updatedAt-index';
const SELLER_INDEX = process.env.CONVERSATIONS_SELLER_INDEX || 'sellerId-updatedAt-index';
const BUCKET_NAME = process.env.VEHICLES_BUCKET_NAME;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const MAX_MESSAGE_LENGTH = Number(process.env.MAX_MESSAGE_LENGTH || 1000);
const UNREAD_QUERY_CONCURRENCY = 5;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const headers = {
  'content-type': 'application/json',
  'access-control-allow-origin': ALLOWED_ORIGIN,
  'access-control-allow-headers': 'Authorization,Content-Type',
  'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
};

const reply = (statusCode, body) => ({
  statusCode,
  headers,
  body: body === undefined ? '' : JSON.stringify(body),
});

const message = (statusCode, text) => reply(statusCode, { message: text });

function identity(event) {
  const claims =
    event.requestContext?.authorizer?.jwt?.claims ||
    event.requestContext?.authorizer?.claims ||
    {};
  const ownerId = claims.sub;
  if (
    !ownerId ||
    claims.email_verified === 'false' ||
    claims['cognito:user_status'] === 'UNCONFIRMED'
  ) {
    return null;
  }
  const fullName =
    claims.name ||
    [claims.given_name, claims.family_name].filter(Boolean).join(' ') ||
    claims['cognito:username'] ||
    claims.email ||
    'Usuário MotorLocal';

  return { ownerId, name: fullName, email: claims.email || '' };
}

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    throw Object.assign(new Error('JSON inválido.'), { statusCode: 400 });
  }
}

function route(event) {
  const method = event.requestContext?.http?.method || event.httpMethod;
  const rawPath = event.rawPath || event.path || '/';
  const stage = event.requestContext?.stage;
  const path =
    stage && stage !== '$default' && rawPath.startsWith(`/${stage}/`)
      ? rawPath.slice(stage.length + 1)
      : rawPath;
  return {
    method,
    path,
    conversationId: event.pathParameters?.conversationId,
  };
}

function buildConversationId(vehicleId, buyerId) {
  const digest = createHash('sha256').update(`${vehicleId}:${buyerId}`).digest('hex').slice(0, 32);
  return `conv_${digest}`;
}

function encodeCursor(key) {
  if (!key) return null;
  return Buffer.from(JSON.stringify(key), 'utf8').toString('base64url');
}

function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== 'string') return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    return parsed && typeof parsed === 'object' ? parsed : undefined;
  } catch {
    throw Object.assign(new Error('Cursor de paginação inválido.'), { statusCode: 400 });
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function resolveSnapshotImage(photoKey) {
  if (!photoKey || !BUCKET_NAME) return '';
  try {
    return await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET_NAME, Key: photoKey }), {
      expiresIn: 900,
    });
  } catch {
    return '';
  }
}

async function fetchVehiclesMap(vehicleIds) {
  const uniqueIds = [...new Set(vehicleIds.filter(Boolean))];
  const map = new Map();
  if (!uniqueIds.length || !VEHICLES_TABLE_NAME) return map;

  for (let i = 0; i < uniqueIds.length; i += 100) {
    const chunk = uniqueIds.slice(i, i + 100);
    const result = await ddb.send(
      new BatchGetCommand({
        RequestItems: {
          [VEHICLES_TABLE_NAME]: {
            Keys: chunk.map((vehicleId) => ({ vehicleId })),
          },
        },
      })
    );
    for (const item of result.Responses?.[VEHICLES_TABLE_NAME] || []) {
      map.set(item.vehicleId, item);
    }
  }
  return map;
}

async function countUnreadForConversation(conv, userId) {
  if (!conv?.conversationId || !userId || !MESSAGES_TABLE_NAME) {
    return 0;
  }

  const isBuyer = conv.buyerId === userId;
  const lastReadAt = isBuyer ? conv.buyerLastReadAt : conv.sellerLastReadAt;
  const hasMarker = typeof lastReadAt === 'string' && lastReadAt.trim().length > 0;

  let total = 0;
  let exclusiveStartKey;

  do {
    const result = await ddb.send(
      new QueryCommand({
        TableName: MESSAGES_TABLE_NAME,
        KeyConditionExpression: hasMarker
          ? 'conversationId = :cid AND createdAtMessageId > :after'
          : 'conversationId = :cid',
        FilterExpression: 'senderId <> :uid',
        ExpressionAttributeValues: hasMarker
          ? {
              ':cid': conv.conversationId,
              ':after': `${lastReadAt.trim()}#\uffff`,
              ':uid': userId,
            }
          : {
              ':cid': conv.conversationId,
              ':uid': userId,
            },
        Select: 'COUNT',
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      })
    );

    total += Number(result.Count || 0);
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return Math.max(0, total);
}

async function fetchUserConversations(userId) {
  const [asBuyer, asSeller] = await Promise.all([
    ddb.send(
      new QueryCommand({
        TableName: CONVERSATIONS_TABLE_NAME,
        IndexName: BUYER_INDEX,
        KeyConditionExpression: 'buyerId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
        ScanIndexForward: false,
      })
    ),
    ddb.send(
      new QueryCommand({
        TableName: CONVERSATIONS_TABLE_NAME,
        IndexName: SELLER_INDEX,
        KeyConditionExpression: 'sellerId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
        ScanIndexForward: false,
      })
    ),
  ]);

  const byId = new Map();
  for (const item of [...(asBuyer.Items || []), ...(asSeller.Items || [])]) {
    byId.set(item.conversationId, item);
  }

  return [...byId.values()].sort((a, b) =>
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
  );
}

async function presentConversation(item, currentUserId, vehicleItem, unreadCount = 0) {
  const isBuyer = item.buyerId === currentUserId;
  const otherParticipantName = isBuyer
    ? item.sellerName || 'Vendedor'
    : item.buyerName || 'Comprador';

  const vehicleStatus = vehicleItem ? vehicleItem.status : 'indisponivel';
  const vehicleAvailable = Boolean(vehicleItem && vehicleItem.status === 'ativo');

  const snapshot = item.vehicleSnapshot || {};
  const photoKey = vehicleItem?.photoKeys?.[0] || snapshot.photoKey || '';
  const mainImage = await resolveSnapshotImage(photoKey);

  return {
    conversationId: item.conversationId,
    vehicleId: item.vehicleId,
    buyerId: item.buyerId,
    sellerId: item.sellerId,
    buyerName: item.buyerName || 'Comprador',
    sellerName: item.sellerName || 'Vendedor',
    otherParticipantName,
    role: isBuyer ? 'buyer' : 'seller',
    vehicleAvailable,
    vehicleStatus,
    vehicle: {
      vehicleId: item.vehicleId,
      title: vehicleItem?.title || snapshot.title || 'Veículo anunciado',
      brand: vehicleItem?.brand || snapshot.brand || '',
      model: vehicleItem?.model || snapshot.model || '',
      year: vehicleItem?.year || snapshot.year || '',
      price: vehicleItem?.price ?? snapshot.price ?? 0,
      city: vehicleItem?.city || snapshot.city || '',
      location: vehicleItem?.location || snapshot.location || '',
      mainImage,
    },
    lastMessageText: item.lastMessageText || null,
    lastMessageAt: item.lastMessageAt || null,
    lastMessageSenderId: item.lastMessageSenderId || null,
    unreadCount: Math.max(0, Number(unreadCount) || 0),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function createOrGetConversation(event) {
  const user = identity(event);
  if (!user) return message(401, 'Usuário autenticado e confirmado é obrigatório.');

  const body = parseBody(event);
  const vehicleId = typeof body.vehicleId === 'string' ? body.vehicleId.trim() : '';
  if (!vehicleId) return message(400, 'O identificador do anúncio (vehicleId) é obrigatório.');

  const { Item: vehicle } = await ddb.send(
    new GetCommand({ TableName: VEHICLES_TABLE_NAME, Key: { vehicleId } })
  );

  if (!vehicle) return message(404, 'Anúncio não encontrado.');
  if (vehicle.status !== 'ativo') {
    return message(400, 'Este anúncio não está ativo para iniciar uma conversa.');
  }
  if (!vehicle.ownerId) {
    return message(400, 'Não foi possível identificar o anunciante deste veículo.');
  }

  const buyerId = user.ownerId;
  const sellerId = vehicle.ownerId;

  if (buyerId === sellerId) {
    return message(400, 'Você não pode iniciar uma conversa sobre o seu próprio anúncio.');
  }

  const conversationId = buildConversationId(vehicleId, buyerId);
  const existing = await ddb.send(
    new GetCommand({ TableName: CONVERSATIONS_TABLE_NAME, Key: { conversationId } })
  );

  if (existing.Item) {
    const unread = await countUnreadForConversation(existing.Item, buyerId);
    return reply(200, await presentConversation(existing.Item, buyerId, vehicle, unread));
  }

  const now = new Date().toISOString();
  const newItem = {
    conversationId,
    vehicleId,
    buyerId,
    sellerId,
    buyerName: user.name,
    sellerName: vehicle.seller?.name || 'Vendedor',
    vehicleSnapshot: {
      title: vehicle.title,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      price: vehicle.price,
      city: vehicle.city,
      location: vehicle.location,
      photoKey: vehicle.photoKeys?.[0] || '',
    },
    lastMessageText: null,
    lastMessageAt: null,
    lastMessageSenderId: null,
    buyerLastReadAt: now,
    sellerLastReadAt: null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await ddb.send(
      new PutCommand({
        TableName: CONVERSATIONS_TABLE_NAME,
        Item: newItem,
        ConditionExpression: 'attribute_not_exists(conversationId)',
      })
    );
    return reply(201, await presentConversation(newItem, buyerId, vehicle, 0));
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      const retry = await ddb.send(
        new GetCommand({ TableName: CONVERSATIONS_TABLE_NAME, Key: { conversationId } })
      );
      if (retry.Item) {
        const unread = await countUnreadForConversation(retry.Item, buyerId);
        return reply(200, await presentConversation(retry.Item, buyerId, vehicle, unread));
      }
    }
    throw error;
  }
}

async function listMyConversations(event) {
  const user = identity(event);
  if (!user) return message(401, 'Autenticação obrigatória.');

  const rawItems = await fetchUserConversations(user.ownerId);
  const [vehiclesMap, unreadCounts] = await Promise.all([
    fetchVehiclesMap(rawItems.map((item) => item.vehicleId)),
    mapWithConcurrency(rawItems, UNREAD_QUERY_CONCURRENCY, (item) =>
      countUnreadForConversation(item, user.ownerId)
    ),
  ]);

  const items = await Promise.all(
    rawItems.map((item, idx) =>
      presentConversation(item, user.ownerId, vehiclesMap.get(item.vehicleId), unreadCounts[idx])
    )
  );

  const totalUnreadCount = items.reduce(
    (sum, item) => sum + Math.max(0, item.unreadCount || 0),
    0
  );

  return reply(200, { items, count: items.length, totalUnreadCount });
}

async function getAuthorizedConversation(conversationId, userId) {
  const { Item } = await ddb.send(
    new GetCommand({ TableName: CONVERSATIONS_TABLE_NAME, Key: { conversationId } })
  );
  if (!Item) {
    throw Object.assign(new Error('Conversa não encontrada.'), { statusCode: 404 });
  }
  if (Item.buyerId !== userId && Item.sellerId !== userId) {
    throw Object.assign(new Error('Você não tem permissão para acessar esta conversa.'), {
      statusCode: 403,
    });
  }
  return Item;
}

async function listMessages(event, conversationId) {
  const user = identity(event);
  if (!user) return message(401, 'Autenticação obrigatória.');

  const conv = await getAuthorizedConversation(conversationId, user.ownerId);

  const rawLimit = Number(event.queryStringParameters?.limit || 50);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;
  const exclusiveStartKey = decodeCursor(event.queryStringParameters?.cursor);

  const [msgResult, vehicleResult, unreadCount] = await Promise.all([
    ddb.send(
      new QueryCommand({
        TableName: MESSAGES_TABLE_NAME,
        KeyConditionExpression: 'conversationId = :cid',
        ExpressionAttributeValues: { ':cid': conversationId },
        ScanIndexForward: true,
        Limit: limit,
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      })
    ),
    ddb.send(
      new GetCommand({
        TableName: VEHICLES_TABLE_NAME,
        Key: { vehicleId: conv.vehicleId },
      })
    ),
    countUnreadForConversation(conv, user.ownerId),
  ]);

  const items = (msgResult.Items || []).map((msg) => ({
    messageId: msg.messageId,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    senderName: msg.senderName,
    text: msg.text,
    createdAt: msg.createdAt,
  }));

  return reply(200, {
    conversation: await presentConversation(
      conv,
      user.ownerId,
      vehicleResult.Item,
      unreadCount
    ),
    items,
    nextCursor: encodeCursor(msgResult.LastEvaluatedKey),
  });
}

async function sendMessage(event, conversationId) {
  const user = identity(event);
  if (!user) return message(401, 'Autenticação obrigatória.');

  if (typeof conversationId !== 'string' || !conversationId.trim()) {
    return message(400, 'Identificador de conversa inválido.');
  }

  const body = parseBody(event);
  if (typeof body.text !== 'string') {
    return message(400, 'O texto da mensagem é obrigatório.');
  }

  const trimmed = body.text.trim();
  if (!trimmed) {
    return message(400, 'A mensagem não pode estar vazia.');
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return message(400, `A mensagem excede o limite de ${MAX_MESSAGE_LENGTH} caracteres.`);
  }

  const conv = await getAuthorizedConversation(conversationId, user.ownerId);
  const isBuyer = conv.buyerId === user.ownerId;
  const senderReadField = isBuyer ? 'buyerLastReadAt' : 'sellerLastReadAt';
  const recipientId = isBuyer ? conv.sellerId : conv.buyerId;

  const now = new Date().toISOString();
  const messageId = randomUUID();
  const createdAtMessageId = `${now}#${messageId}`;
  const previewText = trimmed.slice(0, 140);

  const msgItem = {
    conversationId,
    createdAtMessageId,
    messageId,
    senderId: user.ownerId,
    senderName: user.name,
    text: trimmed,
    createdAt: now,
  };

  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: MESSAGES_TABLE_NAME,
            Item: msgItem,
            ConditionExpression: 'attribute_not_exists(createdAtMessageId)',
          },
        },
        {
          Update: {
            TableName: CONVERSATIONS_TABLE_NAME,
            Key: { conversationId },
            UpdateExpression:
              'SET lastMessageText = :text, lastMessageAt = :now, lastMessageSenderId = :sender, updatedAt = :now, #readMarker = :now',
            ConditionExpression:
              'attribute_exists(conversationId) AND (buyerId = :sender OR sellerId = :sender)',
            ExpressionAttributeNames: {
              '#readMarker': senderReadField,
            },
            ExpressionAttributeValues: {
              ':text': previewText,
              ':now': now,
              ':sender': user.ownerId,
            },
          },
        },
      ],
    })
  );

  if (recipientId && recipientId !== user.ownerId) {
    await publishEventToUser(recipientId, {
      type: 'NEW_MESSAGE',
      conversationId,
      recipientId,
      message: {
        messageId,
        conversationId,
        senderId: user.ownerId,
        senderName: user.name,
        text: trimmed,
        createdAt: now,
      },
      conversation: {
        lastMessageText: previewText,
        lastMessageAt: now,
        lastMessageSenderId: user.ownerId,
      },
    });
  }

  return reply(201, {
    messageId,
    conversationId,
    senderId: user.ownerId,
    senderName: user.name,
    text: trimmed,
    createdAt: now,
  });
}

async function markConversationRead(event, conversationId) {
  const user = identity(event);
  if (!user) return message(401, 'Autenticação obrigatória.');

  if (typeof conversationId !== 'string' || !conversationId.trim()) {
    return message(400, 'Identificador de conversa inválido.');
  }

  const normalizedConversationId = conversationId.trim();
  const conv = await getAuthorizedConversation(normalizedConversationId, user.ownerId);
  const isBuyer = conv.buyerId === user.ownerId;
  const readField = isBuyer ? 'buyerLastReadAt' : 'sellerLastReadAt';
  const recipientId = isBuyer ? conv.sellerId : conv.buyerId;
  const readAt = new Date().toISOString();

  await ddb.send(
    new UpdateCommand({
      TableName: CONVERSATIONS_TABLE_NAME,
      Key: { conversationId: normalizedConversationId },
      UpdateExpression: 'SET #readField = :readAt',
      ConditionExpression:
        'attribute_exists(conversationId) AND (buyerId = :uid OR sellerId = :uid)',
      ExpressionAttributeNames: {
        '#readField': readField,
      },
      ExpressionAttributeValues: {
        ':readAt': readAt,
        ':uid': user.ownerId,
      },
    })
  );

  const userConversations = await fetchUserConversations(user.ownerId);
  const unreadCounts = await mapWithConcurrency(
    userConversations,
    UNREAD_QUERY_CONCURRENCY,
    (item) => {
      if (item.conversationId === normalizedConversationId) {
        return 0;
      }
      return countUnreadForConversation(item, user.ownerId);
    }
  );
  const totalUnreadCount = unreadCounts.reduce((sum, count) => sum + Math.max(0, count), 0);

  if (recipientId && recipientId !== user.ownerId) {
    await publishEventToUser(recipientId, {
      type: 'MESSAGE_READ',
      conversationId: normalizedConversationId,
      readBy: user.ownerId,
      readAt,
    });
  }

  return reply(200, {
    conversationId: normalizedConversationId,
    readBy: user.ownerId,
    readAt,
    unreadCount: 0,
    totalUnreadCount,
  });
}

export async function handler(event) {
  try {
    const { method, path, conversationId } = route(event);
    if (method === 'OPTIONS') return reply(204);

    if (method === 'POST' && path === '/conversations') {
      return createOrGetConversation(event);
    }
    if (method === 'GET' && path === '/conversations') {
      return listMyConversations(event);
    }
    if (method === 'GET' && conversationId && path.endsWith('/messages')) {
      return listMessages(event, conversationId);
    }
    if (method === 'POST' && conversationId && path.endsWith('/messages')) {
      return sendMessage(event, conversationId);
    }
    if (method === 'PATCH' && conversationId && path.endsWith('/read')) {
      return markConversationRead(event, conversationId);
    }

    return message(404, 'Rota não encontrada.');
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return message(403, 'Operação não autorizada ou conversa inexistente.');
    }
    console.error('conversations-api error', { name: error.name, message: error.message });
    return message(error.statusCode || 500, error.statusCode ? error.message : 'Erro interno.');
  }
}
