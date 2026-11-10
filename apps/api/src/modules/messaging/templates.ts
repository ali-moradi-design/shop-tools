import { env } from '@shared/config/env';

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const shop = () => env.STOREFRONT_URL.replace(/\/$/, '');
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const orderNo = (id: string) => `#${id.slice(-6).toUpperCase()}`;

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

interface Action {
  label: string;
  url: string;
}

/** One plain layout for every email: readable without CSS, and the text part says the same as the HTML. */
function layout(subject: string, lines: string[], action?: Action, footer?: Action & { before: string }): RenderedEmail {
  const paragraphs = lines.map((l) => `<p style="margin:0 0 14px">${escape(l)}</p>`).join('');
  const button = action
    ? `<p style="margin:24px 0"><a href="${escape(action.url)}" style="background:#ffc20e;color:#1a1400;border:2px solid #0f1114;padding:12px 20px;text-decoration:none;display:inline-block;font-weight:bold;text-transform:uppercase;letter-spacing:.08em">${escape(action.label)}</a></p>`
    : '';
  const foot = footer
    ? `<p style="margin:24px 0 0;font-size:12px;color:#565e66">${escape(footer.before)} <a href="${escape(footer.url)}" style="color:#565e66">${escape(footer.label)}</a></p>`
    : '';
  const html =
    '<!doctype html><html><body style="margin:0;background:#eef0f2">' +
    '<div style="max-width:560px;margin:0 auto;padding:32px 24px;font:15px/1.6 Arial,sans-serif;color:#0f1114;background:#ffffff;border-top:6px solid #ffc20e">' +
    '<p style="margin:0 0 24px;font-size:13px;font-weight:bold;letter-spacing:.2em;text-transform:uppercase">Toolbench Supply Co.</p>' +
    `${paragraphs}${button}${foot}</div></body></html>`;
  const text = [...lines, ...(action ? [`${action.label}: ${action.url}`] : []), ...(footer ? [`${footer.before} ${footer.label}: ${footer.url}`] : [])].join('\n\n');
  return { subject, text, html };
}

const orderLink = (id: string): Action => ({ label: 'View your order', url: `${shop()}/account/orders/${id}` });

export const templates = {
  welcome: (name: string) =>
    layout('Welcome to Toolbench Supply Co.', [`Hi ${name},`, 'Thanks for creating an account. Your orders, saved tools and addresses are now in one place.'], {
      label: 'Visit the shop',
      url: shop(),
    }),

  guestWelcome: (name: string, setPasswordUrl: string) =>
    layout(
      'Your Toolbench order account',
      [
        `Hi ${name},`,
        'We made an account for your order so you can follow it. Set a password to sign in again later; the link works for one hour, and you can ask for a new one any time.',
      ],
      { label: 'Set a password', url: setPasswordUrl },
    ),

  passwordReset: (name: string, url: string) =>
    layout(
      'Reset your password',
      [
        `Hi ${name},`,
        'Someone asked to reset the password for this account. If it was you, use the link below within one hour. If not, ignore this email: your password stays the same.',
      ],
      { label: 'Choose a new password', url },
    ),

  passwordChanged: (name: string) =>
    layout(
      'Your password was changed',
      [`Hi ${name},`, 'Your password was just changed and your other devices were signed out. If this was not you, reset your password now.'],
      { label: 'Reset password', url: `${shop()}/account/forgot-password` },
    ),

  orderConfirmed: (order: { id: string; totalAmount: number; items: { title: string; label: string; quantity: number }[] }) =>
    layout(
      `Order ${orderNo(order.id)} confirmed`,
      [
        'Thank you for your order. We have your payment and are getting it ready at the warehouse.',
        ...order.items.map((i) => `${i.quantity} × ${i.title} (${i.label})`),
        `Total: ${money(order.totalAmount)}`,
      ],
      orderLink(order.id),
    ),

  orderShipped: (order: { id: string }, tracking?: { carrier: string; trackingNumber: string; url?: string }) =>
    layout(
      `Order ${orderNo(order.id)} is on its way`,
      ['Your tools are on their way.', ...(tracking ? [`${tracking.carrier} tracking number: ${tracking.trackingNumber}`] : [])],
      tracking?.url ? { label: 'Track your parcel', url: tracking.url } : orderLink(order.id),
    ),

  orderCancelled: (order: { id: string }, refunded: boolean) =>
    layout(
      `Order ${orderNo(order.id)} cancelled`,
      ['Your order has been cancelled.', refunded ? 'We have refunded your payment. It can take 5–10 days to show on your statement.' : 'You were not charged.'],
      orderLink(order.id),
    ),

  returnUpdate: (r: { order: string; status: string; note?: string }) =>
    layout(`Your return for order ${orderNo(r.order)}: ${r.status}`, [`Your return request is now: ${r.status}.`, ...(r.note ? [r.note] : [])], orderLink(r.order)),

  backInStock: (p: { slug: string; title: string; option: string }) =>
    layout(`${p.title} is back in stock`, [`Good news: ${p.title} (${p.option}) is back in stock. Units go quickly, so do not wait too long.`], {
      label: 'Get yours',
      url: `${shop()}/products/${p.slug}`,
    }),

  lowStock: (p: { id: string; title: string; stock: number }) =>
    layout(`Low stock: ${p.title}`, [`${p.title} has ${p.stock} units left across all warehouses.`], {
      label: 'Open in admin',
      url: `${shop()}/admin/products/${p.id}`,
    }),

  newsletterWelcome: (unsubscribeUrl: string) =>
    layout(
      'You are on the list',
      ['Thanks for subscribing. We write about new tools, restocks and deals, about once a month.'],
      { label: 'Visit the shop', url: shop() },
      { before: 'Not for you?', label: 'Unsubscribe', url: unsubscribeUrl },
    ),
};
