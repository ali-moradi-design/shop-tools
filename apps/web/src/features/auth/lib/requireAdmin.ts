import 'server-only';
import { notFound } from 'next/navigation';
import { isAdmin, type User } from '@/entities/user';
import { requireUser } from './requireUser';

/** Admin pages: sign-in first, and a 404 for customers (the area stays hidden). */
export async function requireAdmin(from: string): Promise<User> {
  const user = await requireUser(from);
  if (!isAdmin(user)) notFound();
  return user;
}
