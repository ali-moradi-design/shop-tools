import type { IRefreshTokenRepository } from '@modules/identity/domain/refresh-token.repository';
import type { RefreshTokenRecord } from '@modules/identity/domain/auth.types';
import { RefreshTokenModel } from './models/RefreshTokenModel';
import { mapRefreshToken } from './mappers';

export class MongooseRefreshTokenRepository implements IRefreshTokenRepository {
  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshTokenRecord> {
    const doc = await RefreshTokenModel.create({
      user: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
    });
    return mapRefreshToken(doc);
  }

  async findValidByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const doc = await RefreshTokenModel.findOne({
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
    return doc ? mapRefreshToken(doc) : null;
  }

  async revoke(tokenHash: string, replacedByHash?: string): Promise<void> {
    await RefreshTokenModel.findOneAndUpdate(
      { tokenHash, revokedAt: null },
      {
        revokedAt: new Date(),
        ...(replacedByHash ? { replacedByHash } : {}),
      },
    );
  }
}
