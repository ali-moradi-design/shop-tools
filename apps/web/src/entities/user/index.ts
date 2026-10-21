export interface User {
  id: string;
  name: string;
  email: string;
  /** Role ids or populated roles, depending on the endpoint. */
  roles: (string | { name: string })[];
}

export function isAdmin(user: User): boolean {
  return user.roles.some((r) => typeof r === 'object' && r.name === 'admin');
}
