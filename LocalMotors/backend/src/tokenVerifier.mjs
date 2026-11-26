import { CognitoJwtVerifier } from 'aws-jwt-verify';

let cachedVerifier = null;
let cachedConfigKey = '';

function getVerifier() {
  const userPoolId = (process.env.COGNITO_USER_POOL_ID || '').trim();
  const clientId = (process.env.COGNITO_APP_CLIENT_ID || '').trim();

  if (!userPoolId || !clientId) {
    throw new Error('Configuração Cognito ausente para verificação de token.');
  }

  const configKey = `${userPoolId}:${clientId}`;
  if (!cachedVerifier || cachedConfigKey !== configKey) {
    // O frontend (getAccessToken.ts) envia preferencialmente o idToken do Cognito.
    cachedVerifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'id',
      clientId,
    });
    cachedConfigKey = configKey;
  }

  return cachedVerifier;
}

/**
 * Valida criptograficamente o ID Token do Cognito (assinatura JWKS, issuer,
 * audience/clientId, token_use e expiração) e retorna apenas o sub canônico.
 * Nunca registra o token em logs.
 */
export async function verifyCognitoToken(token) {
  if (typeof token !== 'string' || !token.trim()) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }

  let verifier;
  try {
    verifier = getVerifier();
  } catch (err) {
    console.error('[tokenVerifier] Configuração inválida:', { message: err.message });
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
    console.warn('[tokenVerifier] Falha na validação JWT:', { name: err?.name || 'JwtError' });
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
}
