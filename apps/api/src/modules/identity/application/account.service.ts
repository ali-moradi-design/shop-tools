import type { IRoleRepository } from '@modules/identity/domain/rbac.repository';
import type { IMailer } from '@modules/messaging/mailer';
import { templates } from '@modules/messaging/templates';
import { AppError } from '@shared/errors/AppError';
import { prisma } from '@shared/infra/prisma/client';
import type { IPasswordHasher, ITokenService } from './ports';

/*
 * Self-service account features: password reset, guest checkout accounts,
 * profile and password changes, and the address book.
 */

const RESET_TTL_MS = 60 * 60 * 1000;
export const MAX_ADDRESSES = 10;

export interface AddressInput {
  label?: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

type AddressRow = {
  id: string;
  label: string | null;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

const addressFields = (a: AddressInput) => ({
  label: a.label || null,
  fullName: a.fullName,
  line1: a.line1,
  line2: a.line2 || null,
  city: a.city,
  state: a.state || null,
  postalCode: a.postalCode,
  country: a.country,
});

const presentAddress = (a: AddressRow) => ({
  id: a.id,
  label: a.label ?? undefined,
  fullName: a.fullName,
  line1: a.line1,
  line2: a.line2 ?? undefined,
  city: a.city,
  state: a.state ?? undefined,
  postalCode: a.postalCode,
  country: a.country,
  isDefault: a.isDefault,
});

function sameAddress(a: AddressInput, b: AddressInput) {
  const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();
  return (['fullName', 'line1', 'line2', 'city', 'state', 'postalCode', 'country'] as const).every((k) => norm(a[k]) === norm(b[k]));
}

export class AccountService {
  constructor(
    private readonly roles: IRoleRepository,
    private readonly tokens: ITokenService,
    private readonly passwords: IPasswordHasher,
    private readonly mailer: IMailer,
    private readonly storefrontUrl: string,
  ) {}

  private async resetLink(userId: string): Promise<string> {
    const token = this.tokens.generateRefreshToken();
    await prisma.$transaction([
      // a new link replaces older unused ones
      prisma.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } }),
      prisma.passwordResetToken.create({
        data: { userId, tokenHash: this.tokens.hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
      }),
    ]);
    return `${this.storefrontUrl}/account/reset-password?token=${token}`;
  }

  private async issueTokenPair(user: { id: string; email: string }) {
    const accessToken = this.tokens.signAccessToken({ sub: user.id, email: user.email });
    const refreshToken = this.tokens.generateRefreshToken();
    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: this.tokens.hashToken(refreshToken), expiresAt: this.tokens.refreshExpiresAt() },
    });
    return { accessToken, refreshToken };
  }

  private async signOutEverywhere(userId: string, keepRefreshToken?: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null, ...(keepRefreshToken ? { tokenHash: { not: this.tokens.hashToken(keepRefreshToken) } } : {}) },
      data: { revokedAt: new Date() },
    });
  }

  /** Always succeeds from the caller's view, so it cannot reveal which emails have accounts. */
  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findFirst({ where: { email: email.trim().toLowerCase(), deletedAt: null, isActive: true } });
    if (!user) return;
    const url = await this.resetLink(user.id);
    await this.mailer.send({ to: user.email, template: 'password-reset', ...templates.passwordReset(user.name, url) });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const now = new Date();
    const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: this.tokens.hashToken(token) }, include: { user: true } });
    const invalid = new AppError('This link has expired or was already used. Ask for a new one.', 400);
    if (!row || row.usedAt || row.expiresAt <= now || !row.user.isActive || row.user.deletedAt) throw invalid;
    // claim the token first, so the same link cannot be used twice at once
    const claimed = await prisma.passwordResetToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } });
    if (claimed.count === 0) throw invalid;
    await prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await this.passwords.hash(password), guest: false } });
    await this.signOutEverywhere(row.userId);
    await this.mailer.send({ to: row.user.email, template: 'password-changed', ...templates.passwordChanged(row.user.name) });
  }

  /**
   * Guest checkout: a passwordless customer account, signed in right away, with an
   * email to set a password later. An email that already has an account is never
   * signed in this way; its owner gets a set-password link (guest) or is asked to sign in.
   */
  async startGuest(input: { name: string; email: string }) {
    const email = input.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.guest && existing.isActive && !existing.deletedAt) {
        const url = await this.resetLink(existing.id);
        await this.mailer.send({ to: email, template: 'guest-welcome', ...templates.guestWelcome(existing.name, url) });
        throw new AppError('You have checked out with this email before. We emailed you a link to set a password and sign in.', 409);
      }
      throw new AppError('An account already uses this email. Please sign in.', 409);
    }
    const customer = await this.roles.findByName('customer');
    if (!customer) throw new AppError('Default customer role missing; run seed first', 500);
    const user = await prisma.user.create({ data: { name: input.name.trim(), email, guest: true, roles: { create: { roleId: customer.id } } } });
    const url = await this.resetLink(user.id);
    await this.mailer.send({ to: email, template: 'guest-welcome', ...templates.guestWelcome(user.name, url) });
    return { user: { id: user.id, name: user.name, email: user.email, guest: true }, ...(await this.issueTokenPair(user)) };
  }

  async get(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { addresses: { orderBy: { createdAt: 'asc' } } } });
    if (!user) throw new AppError('User not found', 404);
    return { id: user.id, name: user.name, email: user.email, guest: user.guest, addresses: user.addresses.map(presentAddress) };
  }

  /** Changing the email needs the current password, since email is how accounts are recovered. */
  async updateProfile(userId: string, input: { name?: string; email?: string; currentPassword?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);
    const email = input.email?.trim().toLowerCase();
    const data: { name?: string; email?: string } = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (email && email !== user.email) {
      if (!user.passwordHash || !input.currentPassword || !(await this.passwords.compare(input.currentPassword, user.passwordHash))) {
        throw new AppError('Enter your current password to change your email', 400, { fieldErrors: { currentPassword: 'Incorrect password' } });
      }
      if (await prisma.user.findUnique({ where: { email } })) {
        throw new AppError('Another account uses this email', 409, { fieldErrors: { email: 'Already in use' } });
      }
      data.email = email;
    }
    await prisma.user.update({ where: { id: userId }, data });
    return this.get(userId);
  }

  /** The session that changed the password stays signed in; every other device is signed out. */
  async changePassword(userId: string, input: { currentPassword: string; newPassword: string }, keepRefreshToken?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);
    if (!user.passwordHash || !(await this.passwords.compare(input.currentPassword, user.passwordHash))) {
      throw new AppError('Your current password is not correct', 400, { fieldErrors: { currentPassword: 'Incorrect password' } });
    }
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await this.passwords.hash(input.newPassword) } });
    await this.signOutEverywhere(userId, keepRefreshToken);
    await this.mailer.send({ to: user.email, template: 'password-changed', ...templates.passwordChanged(user.name) });
  }

  async sendSetPasswordLink(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);
    const url = await this.resetLink(user.id);
    await this.mailer.send({ to: user.email, template: 'password-reset', ...templates.passwordReset(user.name, url) });
  }

  // Address book: the first address, or one marked default, is the default.

  private async addresses(userId: string) {
    return (await prisma.address.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })).map(presentAddress);
  }

  private async makeDefault(userId: string, addressId: string) {
    await prisma.$transaction([
      prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
      prisma.address.updateMany({ where: { userId, id: addressId }, data: { isDefault: true } }),
    ]);
  }

  async addAddress(userId: string, input: AddressInput) {
    const list = await this.addresses(userId);
    const same = list.find((a) => sameAddress(a, input));
    if (same) {
      if (input.isDefault) await this.makeDefault(userId, same.id);
      return this.addresses(userId);
    }
    if (list.length >= MAX_ADDRESSES) throw new AppError(`You can save up to ${MAX_ADDRESSES} addresses`, 400);
    const created = await prisma.address.create({ data: { userId, ...addressFields(input), isDefault: list.length === 0 } });
    if (input.isDefault && list.length > 0) await this.makeDefault(userId, created.id);
    return this.addresses(userId);
  }

  async updateAddress(userId: string, addressId: string, input: AddressInput) {
    const res = await prisma.address.updateMany({ where: { id: addressId, userId }, data: addressFields(input) });
    if (res.count === 0) throw new AppError('Address not found', 404);
    if (input.isDefault) await this.makeDefault(userId, addressId);
    return this.addresses(userId);
  }

  async removeAddress(userId: string, addressId: string) {
    const target = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!target) throw new AppError('Address not found', 404);
    await prisma.address.delete({ where: { id: addressId } });
    if (target.isDefault) {
      const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
      if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    return this.addresses(userId);
  }
}
