/** What an admin Server Action reports back to the form or table that ran it. */
export type ActionResult =
  | { status: 'ok'; message: string }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> };
