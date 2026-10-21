import { Suspense } from 'react';
import { fetchProducts, ProductCard } from '@/entities/product';
import {
  Hero,
  Split,
  SectionHead,
  CategoryRail,
  ProductRail,
  Reviews,
  Why,
  PressBar,
  CtaBand,
} from '@/widgets/home';

async function Bestsellers() {
  const { data } = await fetchProducts({ featured: true, limit: 12 });
  return (
    <ProductRail>
      {data.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </ProductRail>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Split
        className="mt-1.5"
        tiles={[
          { image: '/media/men-captain-blackcoffee.jpg', alt: "Men's lace-up boots", title: "Shop Men's", href: '/collections/mens-boots' },
          { image: '/media/women-legendplatform-blackmatte.jpg', alt: "Women's Chelsea boots", title: "Shop Women's", href: '/collections/womens-boots' },
        ]}
      />
      <SectionHead title="Built for the long haul" href="/collections/mens-boots" linkLabel="Shop all men's" />
      <CategoryRail
        items={[
          { image: '/media/men-captain-arizona.jpg', label: "Men's Boots", href: '/collections/mens-boots' },
          { image: '/media/men-lincoln-richmahogany.jpg', label: "Men's Shoes", href: '/collections/mens-shoes' },
          { image: '/media/men-weekender-oldenglish.jpg', label: 'Bags', href: '/collections/bags' },
          { image: '/media/men-captain-blackcoffee.jpg', label: 'Wallets', href: '/collections/wallets' },
          { image: '/media/factory.jpg', label: 'Leather Care', href: '/collections/leather-care' },
          { image: '/media/men-racerjacket-blackmatte.jpg', label: 'Belts', href: '/collections/belts' },
        ]}
      />
      <SectionHead title="Bestsellers" href="/collections/mens-boots" linkLabel="Shop all" />
      <Suspense fallback={<div className="h-[380px]" />}>
        <Bestsellers />
      </Suspense>
      <Split
        className="mt-24"
        tiles={[
          {
            image: '/media/men-racerjacket-blackmatte.jpg',
            alt: 'Black leather boots and jacket',
            title: 'Layer Up For Fall',
            href: '/collections/mens-boots',
            links: [
              { href: '/collections/mens-boots', label: 'SHOP MEN' },
              { href: '/collections/womens-boots', label: 'SHOP WOMEN' },
            ],
          },
          {
            image: '/media/women-penny-black.jpg',
            alt: 'Black penny loafers held in one hand',
            title: 'The Loafer Edit',
            href: '/collections/womens-shoes',
            links: [
              { href: '/collections/mens-shoes', label: 'SHOP MEN' },
              { href: '/collections/womens-shoes', label: 'SHOP WOMEN' },
            ],
          },
        ]}
      />
      <SectionHead title="Made for every step" href="/collections/womens-boots" linkLabel="Shop all women's" />
      <CategoryRail
        items={[
          { image: '/media/women-legendplatform-black.jpg', label: "Women's Boots", href: '/collections/womens-boots' },
          { image: '/media/women-penny-blackgold.jpg', label: "Women's Shoes", href: '/collections/womens-shoes' },
          { image: '/media/women-bucketbag-toscanello.jpg', label: 'Handbags', href: '/collections/bags' },
          { image: '/media/women-westernbelt-black.jpg', label: 'Belts', href: '/collections/belts' },
          { image: '/media/women-penny-black.jpg', label: 'Loafers', href: '/collections/womens-shoes' },
          { image: '/media/women-legendplatform-blackmatte.jpg', label: 'New Arrivals', href: '/collections/womens-boots' },
        ]}
      />
      <Reviews />
      <Why />
      <PressBar />
      <CtaBand />
    </>
  );
}
