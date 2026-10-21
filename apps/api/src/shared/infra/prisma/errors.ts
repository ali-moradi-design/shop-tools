import { Prisma } from '@prisma/client';

const hasCode = (err: unknown, code: string): err is Prisma.PrismaClientKnownRequestError =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;

/** A write that targeted a row that does not exist (P2025). */
export const isNotFound = (err: unknown): boolean => hasCode(err, 'P2025');

/** A unique constraint failed (P2002). */
export const isUniqueViolation = (err: unknown): boolean => hasCode(err, 'P2002');

/** A foreign key points at a row that does not exist (P2003). */
export const isForeignKeyViolation = (err: unknown): boolean => hasCode(err, 'P2003');
