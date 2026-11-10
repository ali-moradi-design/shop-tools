/**
 * Starts a request now and awaits it later, so it runs alongside the session
 * check instead of after it. A rejection before the await is not reported as
 * unhandled; awaiting the returned promise still throws it.
 */
export function early<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => {});
  return promise;
}
