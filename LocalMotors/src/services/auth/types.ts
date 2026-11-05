export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  accountType?: 'pf' | 'pj';
  isConfirmed?: boolean;
}

export interface AuthService {
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
  onAuthChange(callback: (user: AuthUser | null) => void): () => void;
}
