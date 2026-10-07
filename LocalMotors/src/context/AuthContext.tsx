import React, { createContext, useContext, useState, useEffect } from 'react';
import { AUTH_MODE, cognitoConfigStatus, type AuthMode } from '../config/cognito';
import { authService, notifyMockAuthChange } from '../services/auth';
import type { AuthUser } from '../services/auth/types';
import type { UserDocument } from '../services/noSqlAuthService';

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authMode: AuthMode;
  configError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  syncMockUserLogin: (userDoc: UserDocument) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const initialUser = await authService.getCurrentUser();
        if (isMounted) {
          setUser(initialUser);

          // Trata retorno do redirecionamento Cognito Hosted UI (?code=...&state=...)
          if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      } catch (err) {
        console.error('[AuthContext] Falha ao verificar autenticação inicial:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const unsubscribe = authService.onAuthChange((changedUser) => {
      if (isMounted) {
        setUser(changedUser);
        setIsLoading(false);

        // Limpa query params ao concluir o redirecionamento
        if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.signInWithGoogle();
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const signOut = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.signOut();
      setUser(null);
    } catch (err) {
      console.error('[AuthContext] Erro ao encerrar sessão:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const syncMockUserLogin = (userDoc: UserDocument): void => {
    const authUser: AuthUser = {
      id: userDoc._id,
      email: userDoc.email,
      name: userDoc.name,
      accountType: userDoc.accountType,
      isConfirmed: userDoc.isConfirmed ?? true,
    };
    setUser(authUser);
    notifyMockAuthChange(authUser);
  };

  const isAuthenticated = !!user;
  const configError = AUTH_MODE === 'cognito' ? cognitoConfigStatus.errorMessage : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        authMode: AUTH_MODE,
        configError,
        signInWithGoogle,
        signOut,
        syncMockUserLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um <AuthProvider>');
  }
  return context;
}
