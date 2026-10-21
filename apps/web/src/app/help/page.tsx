import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help & FAQ',
  description: 'Shipping, returns, sizing and leather care at Welt & Grain.',
};

const FAQ = [
  { id: 'shipping', q: 'How much is shipping?', a: 'Shipping and returns are free on every order. Orders ship within 1–2 business days.' },
  { id: 'returns', q: 'What is your return policy?', a: 'Return unworn items within 30 days for a full refund or an exchange.' },
  { id: 'sizing', q: 'How do your boots fit?', a: 'Most of our boots run a little large: order ½ size smaller than you wear in sneakers. Belts are sized by waist in inches.' },
  { id: 'care', q: 'How do I care for my leather?', a: 'Brush off dirt after wear, condition every few months, and let the leather dry naturally away from heat.' },
  { id: 'demo', q: 'Can I really order?', a: 'No — this is a demo shop. Checkout uses a simulated payment gateway and the data is reset every night.' },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="heading text-[40px]">Help &amp; FAQ</h1>
      <div className="mt-8 divide-y divide-line border-y border-line">
        {FAQ.map((f) => (
          <details key={f.id} id={f.id} className="group scroll-mt-40 py-5" open={f.id === 'shipping'}>
            <summary className="flex cursor-pointer list-none justify-between text-[16px] font-medium">
              {f.q}
              <span aria-hidden className="transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-[15px] text-mute">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
