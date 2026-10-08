import {
  signInWithRedirect,
  signOut as amplifySignOut,
  getCurrentUser as amplifyGetCurrentUser,
  fetchAuthSession,
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { cognitoConfigStatus } from '../../config/cognito';
import type { AuthService, AuthUser } from './types';

// Decodifica o payload do ID Token (JWT) sem verificar assinatura.
// A verificacao de assinatura ja foi feita pelo Amplify ao receber o token do Cognito.
function decodeIdTokenPayload(idToken: string): Record<string, string> {
  try {
    const base64 = idToken.split('.')[1];
    const padded = base64.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded);
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return {};
  }
}

async function resolveCurrentUser(): Promise<AuthUser | null> {
  try {
    const cognitoUser = await amplifyGetCurrentUser();
    const session = await fetchAuthSession();

    const idToken = session.tokens?.idToken?.toString();
    if (!idToken) {
      console.warn('[Cognito] Sem ID Token na sessao.');
      return null;
    }

    const claims = decodeIdTokenPayload(idToken);

    // O Google envia name, email e picture como claims no ID Token via Cognito.
    // Fallback: given_name + family_name caso name nao venha mapeado.
    const fullName =
      claims['name'] ||
      [claims['given_name'], claims['family_name']].filter(Boolean).join(' ') ||
      claims['email'] ||
      'Usuario';

    return {
      id: cognitoUser.userId,
      email: claims['email'] || '',
      name: fullName,
      picture: claims['picture'] || undefined,
      accountType: 'pf',
      isConfirmed: true,
    };
  } catch (err) {
    console.warn('[Cognito] resolveCurrentUser: sem sessao ativa.', err);
    return null;
  }
}

export const cognitoAuthService: AuthService = {
  async signInWithGoogle(): Promise<void> {
    if (!cognitoConfigStatus.isConfigured) {
      throw new Error(
        cognitoConfigStatus.errorMessage ||
          'AWS Cognito nao configurado. Verifique as variaveis VITE_COGNITO_* no .env.local.'
      );
    }
    await signInWithRedirect({ provider: 'Google' });
  },

  async signOut(): Promise<void> {
    try {
      await amplifySignOut();
    } catch (err) {
      console.error('[Cognito] Erro ao realizar logout:', err);
      throw err;
    }
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    if (!cognitoConfigStatus.isConfigured) {
      return null;
    }
    return resolveCurrentUser();
  },

  onAuthChange(callback: (user: AuthUser | null) => void): () => void {
    const stopListening = Hub.listen('auth', async ({ payload }) => {
      const eventName = payload.event as string;

      switch (eventName) {
        case 'signInWithRedirect':
        case 'signedInWithRedirect':
        case 'signedIn': {
          if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          const user = await resolveCurrentUser();
          callback(user);
          break;
        }

        case 'signedOut': {
          callback(null);
          break;
        }

        case 'signInWithRedirect_failure': {
          console.error('[Cognito] Falha no fluxo OAuth:', payload.message ?? payload.event);
          callback(null);
          break;
        }

        case 'tokenRefresh_failure': {
          console.warn('[Cognito] Falha ao renovar token.');
          callback(null);
          break;
        }

        default:
          break;
      }
    });

    return stopListening;
  },
};