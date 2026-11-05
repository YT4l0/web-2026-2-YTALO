import { AUTH_MODE } from '../../config/cognito';
import { cognitoAuthService } from './cognitoAuthService';
import { mockAuthService } from './mockAuthService';
import type { AuthService } from './types';

export * from './types';
export { cognitoAuthService } from './cognitoAuthService';
export { mockAuthService, notifyMockAuthChange } from './mockAuthService';

export const authService: AuthService =
  AUTH_MODE === 'cognito' ? cognitoAuthService : mockAuthService;
