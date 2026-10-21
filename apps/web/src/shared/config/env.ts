/** API base for server + client. Prefer API_URL on server. */
export function getApiUrl(): string {
  const raw =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000';
  return raw.replace(/\/$/, '');
}

export const API_URL = getApiUrl();
export const API_V1 = `${API_URL}/api/v1`;
