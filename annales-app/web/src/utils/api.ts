/**
 * Authenticated fetch wrapper.
 * Automatically includes credentials (HttpOnly cookie) on every request.
 * Redirects to login on 401 (session expired or invalid).
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  if (response.status === 401) {
    // Clear stored user state and redirect to login
    try {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.user) {
          parsed.state.user = null;
          localStorage.setItem('auth-storage', JSON.stringify(parsed));
        }
      }
    } catch {
      // Ignore localStorage errors
    }

    // Only redirect if not already on login/register/public pages
    const path = window.location.pathname;
    if (!['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'].includes(path)) {
      window.location.href = '/login';
    }
  }

  return response;
}
