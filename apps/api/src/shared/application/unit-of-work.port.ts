/** Opaque transaction handle (the application layer never looks inside). */
export type UnitOfWorkSession = unknown;

export interface IUnitOfWork {
  /**
   * Run `fn` in one database transaction: it commits when `fn` returns and rolls back
   * when it throws.
   */
  runInTransaction<T>(fn: (session: UnitOfWorkSession | null) => Promise<T>): Promise<T>;
}
