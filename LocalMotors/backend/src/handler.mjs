import { randomUUID } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const TABLE_NAME = process.env.VEHICLES_TABLE_NAME;
const OWNER_INDEX = process.env.VEHICLES_OWNER_INDEX || 'ownerId-createdAt-index';
const BUCKET_NAME = process.env.VEHICLES_BUCKET_NAME;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const MAX_PHOTOS = Number(process.env.MAX_PHOTOS || 10);
const MAX_PHOTO_BYTES = Number(process.env.MAX_PHOTO_BYTES || 8 * 1024 * 1024);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const headers = {
  'content-type': 'application/json',
  'access-control-allow-origin': ALLOWED_ORIGIN,
  'access-control-allow-headers': 'Authorization,Content-Type',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
};
const reply = (statusCode, body) => ({ statusCode, headers, body: body === undefined ? '' : JSON.stringify(body) });
const message = (statusCode, text) => reply(statusCode, { message: text });

function identity(event) {
  const claims = event.requestContext?.authorizer?.jwt?.claims || event.requestContext?.authorizer?.claims || {};
  const ownerId = claims.sub;
  if (!ownerId) return null;
  return { ownerId, name: claims.name || claims['cognito:username'] || claims.email || 'Vendedor', email: claims.email };
}
function parseBody(event) {
  try { return event.body ? JSON.parse(event.body) : {}; } catch { throw Object.assign(new Error('JSON inválido.'), { statusCode: 400 }); }
}
function route(event) {
  return {
    method: event.requestContext?.http?.method || event.httpMethod,
    path: event.rawPath || event.path || '/',
    id: event.pathParameters?.id,
  };
}
function validate(body, partial = false) {
  const required = ['title', 'brand', 'model', 'year', 'mileage', 'price', 'city', 'state', 'transmission', 'fuel', 'color', 'description', 'vehicleType'];
  if (!partial) for (const field of required) if (body[field] === undefined || body[field] === '') throw Object.assign(new Error(`Campo obrigatório: ${field}.`), { statusCode: 400 });
  if (body.price !== undefined && (!Number.isFinite(body.price) || body.price <= 0)) throw Object.assign(new Error('Preço inválido.'), { statusCode: 400 });
  if (body.mileage !== undefined && (!Number.isFinite(body.mileage) || body.mileage < 0)) throw Object.assign(new Error('Quilometragem inválida.'), { statusCode: 400 });
  if (body.fipePrice !== undefined && body.fipePrice !== null && (!Number.isFinite(body.fipePrice) || body.fipePrice <= 0)) throw Object.assign(new Error('Preço FIPE inválido.'), { statusCode: 400 });
  for (const field of ['title', 'brand', 'model', 'city', 'state', 'transmission', 'fuel', 'color', 'description']) {
    if (body[field] !== undefined && (typeof body[field] !== 'string' || !body[field].trim())) throw Object.assign(new Error(`Campo inválido: ${field}.`), { statusCode: 400 });
  }
}
const protectedFields = new Set(['_id', 'vehicleId', 'ownerId', 'status', 'createdAt', 'updatedAt', 'mainImage', 'gallery', 'seller']);
function publicUpdates(body) {
  const allowed = {};
  for (const [key, value] of Object.entries(body)) if (!protectedFields.has(key)) allowed[key] = value;
  return allowed;
}
async function present(item) {
  const gallery = await Promise.all((item.photoKeys || []).map((key) => getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }), { expiresIn: 900 })));
  return { ...item, _id: item.vehicleId, gallery, mainImage: gallery[0] || '', photoKeys: undefined };
}
function values(query, name) {
  const multi = query?.[name];
  if (Array.isArray(multi)) return multi;
  if (typeof multi === 'string') return multi.split(',').filter(Boolean);
  return [];
}
function matches(item, query) {
  const types = values(query, 'vehicleType'); const cities = values(query, 'city'); const brands = values(query, 'brand');
  const year = Number.parseInt(String(item.year), 10);
  const term = String(query?.searchTerm || '').toLowerCase();
  return (!types.length || types.includes(item.vehicleType)) &&
    (!cities.length || cities.some((city) => item.location?.toLowerCase().includes(city.toLowerCase()))) &&
    (!brands.length || brands.some((brand) => item.brand?.toLowerCase() === brand.toLowerCase())) &&
    (!query?.minPrice || item.price >= Number(query.minPrice)) && (!query?.maxPrice || item.price <= Number(query.maxPrice)) &&
    (!query?.minYear || year >= Number(query.minYear)) && (!query?.maxYear || year <= Number(query.maxYear)) &&
    (!query?.maxMileage || item.mileage <= Number(query.maxMileage)) &&
    (query?.featured === undefined || String(item.featured) === String(query.featured)) &&
    (!query?.ownerId || item.ownerId === query.ownerId) &&
    (!term || [item.title, item.brand, item.model, item.description].some((value) => value?.toLowerCase().includes(term)));
}

async function createVehicle(event) {
  const user = identity(event); if (!user) return message(401, 'Usuário autenticado e confirmado é obrigatório.');
  const body = parseBody(event); validate(body);
  const now = new Date().toISOString(); const vehicleId = randomUUID();
  const item = {
    ...publicUpdates(body), vehicleId, ownerId: user.ownerId, status: 'ativo', photoKeys: [],
    fipePrice: body.fipePrice ?? null, fipeBadge: body.fipePrice ? body.fipeBadge || null : null,
    badges: Array.isArray(body.badges) ? body.badges : [], featured: false,
    mileageFormatted: body.mileageFormatted || `${body.mileage.toLocaleString('pt-BR')} km`,
    location: body.location || `${body.city} - ${body.state}`,
    seller: { name: user.name, type: 'Particular', initials: user.name.slice(0, 2).toUpperCase(), description: '', verified: true },
    createdAt: now, updatedAt: now,
  };
  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item, ConditionExpression: 'attribute_not_exists(vehicleId)' }));
  return reply(201, await present(item));
}
async function listPublic(event) {
  const result = await ddb.send(new ScanCommand({ TableName: TABLE_NAME, FilterExpression: '#status = :active', ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: { ':active': 'ativo' } }));
  let items = (result.Items || []).filter((item) => matches(item, event.queryStringParameters || {}));
  const sort = event.queryStringParameters?.sort;
  items.sort(sort === 'price_asc' ? (a, b) => a.price - b.price : sort === 'price_desc' ? (a, b) => b.price - a.price : (a, b) => b.createdAt.localeCompare(a.createdAt));
  return reply(200, { items: await Promise.all(items.map(present)), count: items.length });
}
async function getPublic(id) {
  const { Item } = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { vehicleId: id } }));
  if (!Item || Item.status !== 'ativo') return message(404, 'Anúncio não encontrado.');
  return reply(200, await present(Item));
}
async function listMine(event) {
  const user = identity(event); if (!user) return message(401, 'Autenticação obrigatória.');
  const result = await ddb.send(new QueryCommand({ TableName: TABLE_NAME, IndexName: OWNER_INDEX, KeyConditionExpression: 'ownerId = :owner', ExpressionAttributeValues: { ':owner': user.ownerId }, ScanIndexForward: false }));
  return reply(200, { items: await Promise.all((result.Items || []).map(present)), count: result.Count || 0 });
}
async function updateVehicle(event, id) {
  const user = identity(event); if (!user) return message(401, 'Autenticação obrigatória.');
  const body = publicUpdates(parseBody(event)); validate(body, true);
  if (body.photoKeys !== undefined && (!Array.isArray(body.photoKeys) || body.photoKeys.some((key) => typeof key !== 'string' || !key.startsWith(`vehicles/${user.ownerId}/${id}/`)))) return message(400, 'Referências de fotos inválidas.');
  const entries = Object.entries(body); if (!entries.length) return message(400, 'Nenhuma alteração válida.');
  const names = { '#owner': 'ownerId', '#updatedAt': 'updatedAt' }; const vals = { ':owner': user.ownerId, ':updatedAt': new Date().toISOString() };
  const sets = ['#updatedAt = :updatedAt']; entries.forEach(([key, value], index) => { names[`#f${index}`] = key; vals[`:v${index}`] = value; sets.push(`#f${index} = :v${index}`); });
  const result = await ddb.send(new UpdateCommand({ TableName: TABLE_NAME, Key: { vehicleId: id }, UpdateExpression: `SET ${sets.join(', ')}`, ConditionExpression: 'attribute_exists(vehicleId) AND #owner = :owner', ExpressionAttributeNames: names, ExpressionAttributeValues: vals, ReturnValues: 'ALL_NEW' }));
  return reply(200, await present(result.Attributes));
}
async function prepareUploads(event, id) {
  const user = identity(event); if (!user) return message(401, 'Autenticação obrigatória.');
  const { Item } = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { vehicleId: id } }));
  if (!Item) return message(404, 'Anúncio não encontrado.'); if (Item.ownerId !== user.ownerId) return message(403, 'Operação não autorizada.');
  const files = parseBody(event).files; if (!Array.isArray(files) || !files.length || files.length > MAX_PHOTOS) return message(400, `Envie entre 1 e ${MAX_PHOTOS} fotos.`);
  const uploads = await Promise.all(files.map(async (file) => {
    if (!IMAGE_TYPES.has(file.contentType) || !Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_PHOTO_BYTES) throw Object.assign(new Error('Foto inválida. Use JPEG, PNG ou WebP dentro do limite.'), { statusCode: 400 });
    const extension = file.contentType === 'image/png' ? 'png' : file.contentType === 'image/webp' ? 'webp' : 'jpg';
    const key = `vehicles/${user.ownerId}/${id}/${randomUUID()}.${extension}`;
    const command = new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, ContentType: file.contentType, ContentLength: file.size, ServerSideEncryption: 'AES256' });
    return { key, uploadUrl: await getSignedUrl(s3, command, { expiresIn: 300 }), headers: { 'Content-Type': file.contentType } };
  }));
  return reply(200, { uploads });
}
async function deleteVehicle(event, id) {
  const user = identity(event); if (!user) return message(401, 'Autenticação obrigatória.');
  const { Item } = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { vehicleId: id } }));
  if (!Item) return reply(204);
  if (Item.ownerId !== user.ownerId) return message(403, 'Operação não autorizada.');
  const keys = Item.photoKeys || [];
  if (keys.length) await s3.send(new DeleteObjectsCommand({ Bucket: BUCKET_NAME, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true } }));
  await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { vehicleId: id }, ConditionExpression: 'attribute_exists(vehicleId) AND ownerId = :owner', ExpressionAttributeValues: { ':owner': user.ownerId } }));
  return reply(204);
}

export async function handler(event) {
  try {
    const { method, path, id } = route(event);
    if (method === 'OPTIONS') return reply(204);
    if (method === 'POST' && path === '/vehicles') return createVehicle(event);
    if (method === 'GET' && path === '/vehicles') return listPublic(event);
    if (method === 'GET' && path === '/me/vehicles') return listMine(event);
    if (method === 'GET' && id) return getPublic(id);
    if (method === 'PATCH' && id) return updateVehicle(event, id);
    if (method === 'POST' && id && path.endsWith('/photo-uploads')) return prepareUploads(event, id);
    if (method === 'DELETE' && id) return deleteVehicle(event, id);
    return message(404, 'Rota não encontrada.');
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') return message(403, 'Anúncio inexistente ou operação não autorizada.');
    console.error('vehicle-api error', { name: error.name, message: error.message });
    return message(error.statusCode || 500, error.statusCode ? error.message : 'Erro interno.');
  }
}
