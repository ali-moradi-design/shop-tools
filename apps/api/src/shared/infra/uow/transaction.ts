import mongoose from 'mongoose';

/**
 * Run work inside a MongoDB transaction when the topology supports it
 * (replica set / mongos). Falls back to plain execution for standalone
 * (e.g. mongodb-memory-server default / local single node).
 */
export async function withTransaction<T>(fn: (session: mongoose.ClientSession | null) => Promise<T>): Promise<T> {
  const conn = mongoose.connection;
  if (conn.readyState !== 1) {
    return fn(null);
  }

  let session: mongoose.ClientSession | null = null;
  try {
    session = await conn.startSession();
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (err) {
    // Standalone / memory server often rejects transactions — retry without session
    const msg = err instanceof Error ? err.message : String(err);
    if (/transaction|replica set|not supported/i.test(msg)) {
      if (session) {
        try {
          await session.endSession();
        } catch {
          /* ignore */
        }
        session = null;
      }
      return fn(null);
    }
    throw err;
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch {
        /* ignore */
      }
    }
  }
}
