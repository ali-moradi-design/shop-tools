import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Forgot Password' };

export default function ForgotPasswordPage() {
  return (
    <div className="container-page max-w-md py-16">
      <h1 className="heading text-center text-[32px]">Forgot Password</h1>
      <p className="mt-3 text-center text-[14px] text-mute">Enter the email you shop with and we will send you a link to choose a new password.</p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-[14px] text-mute">
        Remembered it? <Link href="/account/login" className="link-underline text-ink">Sign in</Link>
      </p>
    </div>
  );
}
