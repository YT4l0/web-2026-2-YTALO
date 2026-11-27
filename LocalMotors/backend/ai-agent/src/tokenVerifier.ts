/**
 * src/tokenVerifier.ts
 * Verifica o Access Token do Cognito (tokenUse: 'access').
 * O ChatWidget envia session.tokens?.accessToken — diferente das conversas
 * entre usuários, que enviam idToken.
 */
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { config } from './config.js';

type Verifier = ReturnType<typeof CognitoJwtVerifier.create>;

let cachedVerifier: Verifier | null = null;
let cachedConfigKey = '';

function getVerifier(): Verifier {
  const userPoolId = config.cognitoUserPoolId;
  const clientId = config.cognitoClientId;
  const configKey = `${userPoolId}:${clientId}`;

  if (!cachedVerifier || cachedConfigKey !== configKey) {
    cachedVerifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'access', // O useChatSocket.ts usa accessToken
      clientId,
    });
    cachedConfigKey = configKey;
  }

  return cachedVerifier;
}

/**
 * Valida criptograficamente o Access Token do Cognito e retorna o sub canônico.
 * Nunca registra o token em logs.
 */
export async function verifyAccessToken(token: string): Promise<{ sub: string }> {
  if (typeof token !== 'string' || !token.trim()) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }

  let verifier: Verifier;
  try {
    verifier = getVerifier();
  } catch (err) {
    const name = err instanceof Error ? err.message : String(err);
    console.error('[tokenVerifier] Configuração inválida:', { message: name });
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }

  try {
    const payload = await verifier.verify(token.trim());
    const sub = typeof payload?.sub === 'string' ? payload.sub.trim() : '';
    if (!sub) {
      throw new Error('Missing sub');
    }
    return { sub };
  } catch (err) {
    const name = err instanceof Error ? err.name : 'JwtError';
    console.warn('[tokenVerifier] Falha na validação JWT:', { name });
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
}
