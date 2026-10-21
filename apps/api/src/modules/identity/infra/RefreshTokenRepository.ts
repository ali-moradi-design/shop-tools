import type { IRefreshTokenRepository } from '@modules/identity/domain/refresh-token.repository';
import type { RefreshTokenRecord } from '@modules/identity/domain/auth.types';
import { getPrisma } from '@shared/infra/prisma/client';
import { mapRefreshToken } from './mappers';

export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshTokenRecord> {
    return mapRefreshToken(await getPrisma().refreshToken.create({ data }));
  }

  async findValidByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const row = await getPrisma().refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    return row ? mapRefreshToken(row) : null;
  }

  async revoke(tokenHash: string, replacedByHash?: string): Promise<void> {
    await getPrisma().refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date(), ...(replacedByHash ? { replacedByHash } : {}) },
    });
  }
}
