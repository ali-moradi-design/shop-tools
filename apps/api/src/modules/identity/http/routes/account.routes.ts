import { Router } from 'express';
import { z } from 'zod';
import { validate } from '@shared/http/middleware/validate';
import { asyncHandler } from '@shared/http/asyncHandler';
import { authRateLimiter } from '@shared/http/middleware/rate-limit';
import { env } from '@shared/config/env';
import { authenticate } from '../middleware';
import { setAuthCookies, resolveRefreshToken } from '../cookies/authCookies';
import { accountService } from '../../infra/wiring';

const password = z.string().min(8, 'At least 8 characters').max(128);
const addressId = z.string().min(1).max(40);
const address = z.object({
  label: z.string().trim().max(40).optional(),
  fullName: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(1).max(80),
  isDefault: z.boolean().optional(),
});

const limited = env.NODE_ENV === 'test' ? [] : [authRateLimiter];

/** Password reset and guest checkout: public, under /auth. */
export const publicAccountRoutes = Router();

publicAccountRoutes.post(
  '/forgot-password',
  ...limited,
  validate({ body: z.object({ email: z.string().trim().email().max(200) }) }),
  asyncHandler(async (req, res) => {
    await accountService.forgotPassword(req.body.email);
    res.status(202).json({ message: 'If an account uses this email, a reset link is on its way.' });
  }),
);

publicAccountRoutes.post(
  '/reset-password',
  ...limited,
  validate({ body: z.object({ token: z.string().regex(/^[a-f0-9]{64,128}$/), password }) }),
  asyncHandler(async (req, res) => {
    await accountService.resetPassword(req.body.token, req.body.password);
    res.json({ message: 'Password updated. You can sign in now.' });
  }),
);

publicAccountRoutes.post(
  '/guest',
  ...limited,
  validate({ body: z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(200) }) }),
  asyncHandler(async (req, res) => {
    const result = await accountService.startGuest(req.body);
    setAuthCookies(res, result);
    res.status(201).json(result);
  }),
);

/** The signed-in customer's own account, under /account. */
export const accountRoutes = Router();
accountRoutes.use(authenticate);

accountRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await accountService.get(req.user!.id) });
  }),
);

accountRoutes.patch(
  '/',
  validate({
    body: z.object({
      name: z.string().trim().min(2).max(100).optional(),
      email: z.string().trim().email().max(200).optional(),
      currentPassword: z.string().max(128).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    res.json({ data: await accountService.updateProfile(req.user!.id, req.body) });
  }),
);

accountRoutes.post(
  '/password',
  validate({
    // refreshToken: the session to keep, for clients without the cookie
    body: z.object({ currentPassword: z.string().min(1).max(128), newPassword: password, refreshToken: z.string().max(200).optional() }),
  }),
  asyncHandler(async (req, res) => {
    // the session that changed the password (its refresh cookie) stays signed in
    await accountService.changePassword(req.user!.id, req.body, resolveRefreshToken(req) ?? undefined);
    res.json({ message: 'Password changed. Other devices were signed out.' });
  }),
);

accountRoutes.post(
  '/set-password-link',
  ...limited,
  asyncHandler(async (req, res) => {
    await accountService.sendSetPasswordLink(req.user!.id);
    res.status(202).json({ message: 'We emailed you a link to set your password.' });
  }),
);

accountRoutes.post(
  '/addresses',
  validate({ body: address }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await accountService.addAddress(req.user!.id, req.body) });
  }),
);

accountRoutes.put(
  '/addresses/:id',
  validate({ params: z.object({ id: addressId }), body: address }),
  asyncHandler(async (req, res) => {
    res.json({ data: await accountService.updateAddress(req.user!.id, String(req.params.id), req.body) });
  }),
);

accountRoutes.delete(
  '/addresses/:id',
  validate({ params: z.object({ id: addressId }) }),
  asyncHandler(async (req, res) => {
    res.json({ data: await accountService.removeAddress(req.user!.id, String(req.params.id)) });
  }),
);
