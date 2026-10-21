import type { IUnitOfWork, UnitOfWorkSession } from '../../application/unit-of-work.port';
import { withTransaction } from './transaction';

export class MongooseUnitOfWork implements IUnitOfWork {
  runInTransaction<T>(fn: (session: UnitOfWorkSession | null) => Promise<T>): Promise<T> {
    return withTransaction((session) => fn(session));
  }
}
