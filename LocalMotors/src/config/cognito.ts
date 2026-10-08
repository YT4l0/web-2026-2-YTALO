import { Amplify } from 'aws-amplify';

export type AuthMode = 'cognito' | 'mock';

export interface CognitoConfigStatus {
  isConfigured: boolean;
  missingVars: string[];
  errorMessage: string | null;
}
console.log('VITE_AUTH_MODE =', import.meta.env.VITE_AUTH_MODE);
const rawAuthMode = import.meta.env.VITE_AUTH_MODE as string | undefined;
export const AUTH_MODE: AuthMode = rawAuthMode === 'cognito' ? 'cognito' : 'mock';

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined;
const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;
const rawDomain = import.meta.env.VITE_COGNITO_DOMAIN as string | undefined;
const cleanDomain = rawDomain ? rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '') : undefined;

const defaultOrigin = typeof window !== 'undefined' ? `${window.location.origin}/` : 'http://localhost:5173/';
const redirectSignIn = (import.meta.env.VITE_COGNITO_REDIRECT_SIGN_IN as string) || defaultOrigin;
const redirectSignOut = (import.meta.env.VITE_COGNITO_REDIRECT_SIGN_OUT as string) || defaultOrigin;

export const cognitoConfigStatus: CognitoConfigStatus = {
  isConfigured: false,
  missingVars: [],
  errorMessage: null,
};

if (AUTH_MODE === 'cognito') {
  const missing: string[] = [];
  if (!userPoolId) missing.push('VITE_COGNITO_USER_POOL_ID');
  if (!userPoolClientId) missing.push('VITE_COGNITO_CLIENT_ID');
  if (!cleanDomain) missing.push('VITE_COGNITO_DOMAIN');

  // Detecta o erro comum de colocar o URL do OpenID Discovery em vez do domínio Hosted UI.
  // Correto:   meu-prefixo.auth.us-east-1.amazoncognito.com
  // Incorreto: cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXX/.well-known/openid-configuration
  if (cleanDomain && (cleanDomain.includes('/.well-known/') || cleanDomain.includes('cognito-idp.'))) {
    const domainError =
      'VITE_COGNITO_DOMAIN contém uma URL de discovery (.well-known) em vez do domínio do Hosted UI. ' +
      'O valor correto é o prefixo configurado no Cognito, ex: meu-app.auth.us-east-1.amazoncognito.com';
    missing.push('VITE_COGNITO_DOMAIN (valor inválido)');
    console.error('[AWS Cognito] ' + domainError);
  }

  if (missing.length > 0) {
    cognitoConfigStatus.missingVars = missing;
    cognitoConfigStatus.errorMessage = `Cognito não configurado. Variáveis ausentes no .env: ${missing.join(', ')}`;
    console.error(
      `[AWS Cognito] Configuração incompleta para VITE_AUTH_MODE='cognito'. Variáveis ausentes: ${missing.join(', ')}.`
    );
  } else {
    try {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId: userPoolId!,
            userPoolClientId: userPoolClientId!,
            loginWith: {
              oauth: {
                domain: cleanDomain!,
                scopes: ['openid', 'email', 'profile'],
                redirectSignIn: [redirectSignIn],
                redirectSignOut: [redirectSignOut],
                responseType: 'code',
              },
            },
          },
        },
      });
      cognitoConfigStatus.isConfigured = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      cognitoConfigStatus.errorMessage = `Erro ao configurar o AWS Amplify Cognito: ${msg}`;
      console.error('[AWS Cognito] Erro ao executar Amplify.configure:', err);
    }
  }
}
