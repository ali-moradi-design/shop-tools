export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      /** Cart owner key, set by resolveCartOwner. */
      cartOwner?: string;
      requestId?: string;
    }
  }
}

export {};
