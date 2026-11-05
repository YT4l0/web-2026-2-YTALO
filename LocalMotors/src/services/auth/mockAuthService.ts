import {
  getActiveSession,
  setActiveSession,
  type UserDocument,
} from '../noSqlAuthService';
import type { AuthService, AuthUser } from './types';

function mapDocumentToAuthUser(doc: UserDocument | null): AuthUser | null {
  if (!doc) return null;
  return {
    id: doc._id,
    email: doc.email,
    name: doc.name,
    picture: undefined,
    accountType: doc.accountType,
    isConfirmed: doc.isConfirmed ?? true,
  };
}

const listeners = new Set<(user: AuthUser | null) => void>();

export function notifyMockAuthChange(user: AuthUser | null): void {
  listeners.forEach((cb) => cb(user));
}

export const mockAuthService: AuthService = {
  async signInWithGoogle(): Promise<void> {
    // Simula latência de rede no ambiente de desenvolvimento
    await new Promise((resolve) => setTimeout(resolve, 300));

    const mockGoogleUser: UserDocument = {
      _id: 'mock_google_user_id',
      email: 'usuario.google@example.com',
      name: 'Google Demo User',
      accountType: 'pf',
      passwordHash: 'mock_hash',
      createdAt: new Date().toISOString(),
      isConfirmed: true,
    };

    setActiveSession(mockGoogleUser);
    const authUser = mapDocumentToAuthUser(mockGoogleUser);
    notifyMockAuthChange(authUser);
  },

  async signOut(): Promise<void> {
    setActiveSession(null);
    notifyMockAuthChange(null);
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const session = getActiveSession();
    return mapDocumentToAuthUser(session);
  },

  onAuthChange(callback: (user: AuthUser | null) => void): () => void {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },
};
