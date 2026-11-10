export interface FaqItem {
  /** Anchor for links such as /help#returns */
  id: string;
  q: string;
  /** Paragraphs */
  a: string[];
}

export interface FaqSection {
  id: string;
  title: string;
  items: FaqItem[];
}

export const FAQ: FaqSection[] = [
  {
    id: 'orders',
    title: 'Orders & payment',
    items: [
      {
        id: 'demo',
        q: 'Can I really order?',
        a: [
          'No, Toolbench is a portfolio demo. Checkout runs a simulated Stripe Checkout: pay with the test card 4242 4242 4242 4242; 4000 0000 0000 0002 shows a declined card. No money moves.',
          'The demo data is reset every night, and the demo account is shared, so please do not enter real personal data.',
        ],
      },
      {
        id: 'guest',
        q: 'Do I need an account?',
        a: [
          'No. On the way to checkout choose “Continue as guest”: we make an account for your order and email you a link to set a password later, if you want one.',
        ],
      },
      {
        id: 'cancel',
        q: 'Can I cancel an order?',
        a: ['Yes, until it ships. Open the order in your account and choose “Cancel order”; a paid order is refunded right away.'],
      },
      {
        id: 'payment-pending',
        q: 'My order still says “Awaiting payment”',
        a: ['Your bank confirms the payment to us a moment after you return to the shop. The order page refreshes by itself; if it still waits after a minute, reload it. You are never charged twice.'],
      },
    ],
  },
  {
    id: 'shipping',
    title: 'Shipping & tracking',
    items: [
      {
        id: 'shipping-cost',
        q: 'How much is shipping?',
        a: ['Free over $150. An order ships from the nearest warehouse that has the items; if they are in different warehouses it ships in parcels.'],
      },
      {
        id: 'warehouses',
        q: 'Which warehouse ships my tools?',
        a: [
          'Every product page lists the stock in Berlin, Hamburg and Munich. Berlin dispatches the same day when you order before 14:00, the others the next day.',
          'Once an order is paid, its page shows which warehouse each unit left from.',
        ],
      },
      {
        id: 'tracking',
        q: 'Where is my parcel?',
        a: ['When your order ships we email you the carrier and tracking number. The order page in your account has the same tracking link.'],
      },
    ],
  },
  {
    id: 'returns',
    title: 'Returns & warranty',
    items: [
      {
        id: 'return-policy',
        q: 'What is your return policy?',
        a: ['Return unused tools within 30 days of shipping for a full refund of what you paid (a discount is shared out over the items). Power tools carry a two-year warranty.'],
      },
      {
        id: 'how-to-return',
        q: 'How do I return something?',
        a: [
          'Open the order in your account, choose “Return items”, pick how many of each item and why. We email you at each step: approved, received at the warehouse, refunded.',
          'The refund goes back to the card you paid with.',
        ],
      },
    ],
  },
  {
    id: 'specs',
    title: 'Specifications & stock',
    items: [
      {
        id: 'filters',
        q: 'How do the specification filters work?',
        a: [
          'Each category has its own specifications. Drag a range or type numbers, and switch the unit next to the filter (Nm or in·lb, mm or inches, kg or lb). Words such as “Brushless” are checkboxes.',
        ],
      },
      {
        id: 'compare',
        q: 'How many tools can I compare?',
        a: ['Two to four tools of the same category. Tick “Compare” on a card; the tray at the bottom opens the table, with the best value of each row marked.'],
      },
      {
        id: 'back-in-stock',
        q: 'A tool is sold out. Will it come back?',
        a: ['Choose “Sold out? Get an email when it is back” under the button on the product page. We email you once when it is in stock again.'],
      },
    ],
  },
];
