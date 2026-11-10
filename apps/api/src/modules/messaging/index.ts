import type { Router } from 'express';
import { emailsRouter, newsletterRouter } from './http/routes';

/** Email (SMTP or the outbox) and the newsletter list. */
export function registerMessagingRoutes(api: Router): void {
  api.use('/newsletter', newsletterRouter);
  api.use('/emails', emailsRouter);
}

export { mailer, type IMailer } from './mailer';
export { templates } from './templates';
export { registerNotifications } from './notifications';
