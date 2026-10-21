import type { ITokenService } from '../application/ports';
import type { AccessTokenPayload } from '@modules/identity/domain/auth.types';
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  refreshExpiresAt,
} from './tokens';

export class JwtTokenService implements ITokenService {
  signAccessToken(payload: AccessTokenPayload): string {
    return signAccessToken(payload);
  }
  verifyAccessToken(token: string): AccessTokenPayload {
    return verifyAccessToken(token);
  }
  generateRefreshToken(): string {
    return generateRefreshToken();
  }
  hashToken(token: string): string {
    return hashToken(token);
  }
  refreshExpiresAt(): Date {
    return refreshExpiresAt();
  }
}
