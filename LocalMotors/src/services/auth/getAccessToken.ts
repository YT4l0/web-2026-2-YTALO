import { fetchAuthSession } from 'aws-amplify/auth';
import { AUTH_MODE, cognitoConfigStatus } from '../../config/cognito';

/**
 * Retorna o token JWT para ser utilizado no cabeçalho Authorization: Bearer <token>
 * em futuras chamadas a APIs protegidas (ex: AWS API Gateway).
 *
 * Em modo 'cognito', utiliza fetchAuthSession() da AWS Amplify.
 * Em modo 'mock', retorna um token fictício para desenvolvimento offline.
 *
 * SEGURANÇA: Nunca realize console.log do token.
 */
export async function getAccessToken(): Promise<string | null> {
  if (AUTH_MODE === 'mock') {
    return 'mock-jwt-token-dev-only';
  }

  if (!cognitoConfigStatus.isConfigured) {
    return null;
  }

  try {
    const session = await fetchAuthSession();
    // Preferência pelo idToken (contém claims do usuário) ou accessToken
    const token =
      session.tokens?.idToken?.toString() ||
      session.tokens?.accessToken?.toString();

    return token || null;
  } catch (err) {
    console.error('Falha ao obter sessão de autenticação do Cognito:', err);
    return null;
  }
}
