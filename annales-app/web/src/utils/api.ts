/**
 * Authenticated fetch wrapper.
 * Automatically includes credentials (HttpOnly cookie) on every request.
 */
export function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include',
  });
}
