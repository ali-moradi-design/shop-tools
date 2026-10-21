import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help & FAQ',
  description: 'Shipping, returns, specifications and units at Toolbench Supply Co.',
};

const FAQ = [
  { id: 'shipping', q: 'How much is shipping?', a: 'Free over $150. An order ships from the nearest warehouse that has every item; if the items are in different warehouses it ships in parcels.' },
  { id: 'returns', q: 'What is your return policy?', a: 'Return unused tools within 30 days for a full refund. Power tools carry a two-year warranty.' },
  { id: 'specs', q: 'How do the specification filters work?', a: 'Each category has its own specifications. Drag a range or type numbers, and switch the unit (for example Nm or in·lb) next to the filter. Words (like “Brushless”) are checkboxes.' },
  { id: 'compare', q: 'How many tools can I compare?', a: 'Two to four tools of the same category. Tick “Compare” on a card; the tray at the bottom opens the comparison table.' },
  { id: 'demo', q: 'Can I really order?', a: 'No — this is a demo shop. Checkout uses a simulated payment gateway and the data is reset every night.' },
];

export default function HelpPage() {
  return (
    <div className="container-page max-w-3xl py-14">
      <h1 className="heading text-[48px] leading-none">Help &amp; FAQ</h1>
      <div className="panel mt-8 divide-y divide-line-soft">
        {FAQ.map((f) => (
          <details key={f.id} id={f.id} className="group scroll-mt-40 px-5 py-4" open={f.id === 'shipping'}>
            <summary className="flex cursor-pointer list-none justify-between text-[16px] font-semibold">
              {f.q}
              <span aria-hidden className="transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-[15px] text-steel">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
