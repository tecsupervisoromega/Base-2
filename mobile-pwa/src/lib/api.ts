// Cliente HTTP minimo para la PWA del tecnico
// Maneja JWT y baseUrl automaticamente.

const API_URL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
    : 'http://localhost:4000';

function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('base2.token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const apiGet = <T = any>(path: string) => api<T>(path, { method: 'GET' });
export const apiPost = <T = any>(path: string, body: any) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const apiPatch = <T = any>(path: string, body: any) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const apiDelete = <T = any>(path: string) => api<T>(path, { method: 'DELETE' });

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('base2.token');
}

export { API_URL };
