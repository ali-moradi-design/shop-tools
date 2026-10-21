import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-page py-28 text-center">
      <h1 className="heading text-[32px]">Page not found</h1>
      <p className="mt-3 text-mute">The page you are looking for is gone or never existed.</p>
      <Link href="/" className="btn mt-8">Back to the shop</Link>
    </div>
  );
}
