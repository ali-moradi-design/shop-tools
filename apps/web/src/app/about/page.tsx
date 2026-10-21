import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description: 'A demo tool shop built around technical specifications, units, comparison and stock per warehouse.',
};

export default function AboutPage() {
  return (
    <div className="container-page max-w-3xl space-y-6 py-14 text-[16px] leading-8">
      <h1 className="heading text-[48px] leading-none">About Toolbench</h1>
      <p>
        Toolbench is a portfolio demo: a tool shop that puts the numbers first. Every category has its own
        specifications — torque, voltage, blade diameter, accuracy — and you can filter by them with ranges, in the
        unit you think in (Nm or in·lb, mm or inches, kg or lb).
      </p>
      <h2 className="heading pt-4 text-[28px]">Compare</h2>
      <p>
        Tick “Compare” on up to four products of one category and see them side by side. The best value in each row
        (highest torque, lowest weight …) is marked.
      </p>
      <h2 className="heading pt-4 text-[28px]">Stock per warehouse</h2>
      <p>
        Stock is kept per warehouse (Berlin, Hamburg, Munich). An order takes units from the nearest warehouse first and
        remembers where each unit came from.
      </p>
      <p className="panel p-4 text-[14px] leading-7">
        Nothing here is for sale. Product photos belong to their owners and are used only as sample content; names,
        prices and stock levels are generated, the payment gateway is simulated and the data resets every night.
      </p>
      <Link href="/categories/drills" className="btn">Start with drills</Link>
    </div>
  );
}
