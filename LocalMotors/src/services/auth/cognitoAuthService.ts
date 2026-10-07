import {
  signInWithRedirect,
  signOut as amplifySignOut,
  getCurrentUser as amplifyGetCurrentUser,
  fetchUserAttributes,
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { cognitoConfigStatus } from '../../config/cognito';
import type { AuthService, AuthUser } from './types';

export const cognitoAuthService: AuthService = {
  async signInWithGoogle(): Promise<void> {
    if (!cognitoConfigStatus.isConfigured) {
      throw new Error(
        cognitoConfigStatus.errorMessage ||
          'AWS Cognito não configurado. Verifique as variáveis de ambiente VITE_COGNITO_* no .env.local.'
      );
    }

    try {
      await signInWithRedirect({ provider: 'Google' });
    } catch (err) {
      console.error('[Cognito] Erro ao iniciar redirecionamento Google:', err);
      throw err;
    }
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

    try {
      const user = await amplifyGetCurrentUser();
      const attributes = await fetchUserAttributes();

      const authUser: AuthUser = {
        id: user.userId,
        email: attributes.email || '',
        name: attributes.name || attributes.email || 'Usuário',
        picture: attributes.picture,
        accountType: 'pf',
        isConfirmed: true,
      };

      return authUser;
    } catch {
      return null;
    }
  },

  onAuthChange(callback: (user: AuthUser | null) => void): () => void {
    const stopListening = Hub.listen('auth', async ({ payload }) => {
      const eventName = payload.event as string;
      switch (eventName) {
        case 'signInWithRedirect':
        case 'signedInWithRedirect':
        case 'signedIn': {
          try {
            const user = await cognitoAuthService.getCurrentUser();
            callback(user);
          } catch {
            callback(null);
          }
          break;
        }
        case 'signedOut': {
          callback(null);
          break;
        }
        case 'signInWithRedirect_failure': {
          console.error('[Cognito] Falha no redirecionamento OAuth:', payload);
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
