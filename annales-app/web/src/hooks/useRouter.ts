import { useState, useEffect, useCallback } from 'react';
import { useInstance } from './useInstance';

export interface RouteParams {
  examId?: string;
  token?: string;
}

export interface Route {
  path: string;
  page:
    | 'upload'
    | 'exams'
    | 'viewer'
    | 'admin-reports'
    | 'admin-users'
    | 'login'
    | 'register'
    | 'forgot-password'
    | 'reset-password'
    | 'verify-email'
    | 'profile'
    | 'privacy'
    | 'terms';
  params: RouteParams;
}

/**
 * Hook to handle simple routing with the History API
 * Supports routes: /, /upload, /exam/:examId
 */
export function useRouter() {
  const { name: instanceName } = useInstance();
  const [currentRoute, setCurrentRoute] = useState<Route>(() => parseCurrentPath());

  /**
   * Helper to build the path for a route
   * @param page - Page type to build
   * @param params - Route parameters (examId, token, etc.)
   * @returns The route path or null on error
   */
  const buildPath = useCallback((page: Route['page'], params: RouteParams = {}) => {
    switch (page) {
      case 'upload':
        return '/upload';
      case 'profile':
        return '/profile';
      case 'admin-reports':
        return '/admin/reports';
      case 'admin-users':
        return '/admin/users';
      case 'login':
        return '/login';
      case 'register':
        return '/register';
      case 'forgot-password':
        return '/forgot-password';
      case 'reset-password':
        return `/reset-password${params.token ? `?token=${params.token}` : ''}`;
      case 'verify-email':
        return `/verify-email${params.token ? `?token=${params.token}` : ''}`;
      case 'privacy':
        return '/privacy';
      case 'terms':
        return '/terms';
      case 'viewer':
        if (!params.examId) {
          console.error('examId required for viewer route');
          return null;
        }
        return `/exam/${params.examId}`;
      case 'exams':
      default:
        return '/';
    }
  }, []);

  /**
   * Helper to synchronize all useRouter instances
   * Manually dispatches a popstate event to notify other hooks
   */
  const syncRouterInstances = useCallback(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  /**
   * Parse the current path into a route
   * @returns The Route object corresponding to the current path
   */
  function parseCurrentPath(): Route {
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);

    if (path === '/upload') {
      return { path, page: 'upload', params: {} };
    }

    if (path === '/admin/reports') {
      return { path, page: 'admin-reports', params: {} };
    }

    if (path === '/admin/users') {
      return { path, page: 'admin-users', params: {} };
    }

    if (path === '/profile') {
      return { path, page: 'profile', params: {} };
    }

    if (path === '/login') {
      return { path, page: 'login', params: {} };
    }

    if (path === '/register') {
      return { path, page: 'register', params: {} };
    }

    if (path === '/forgot-password') {
      return { path, page: 'forgot-password', params: {} };
    }

    if (path === '/reset-password') {
      const token = urlParams.get('token');
      return { path, page: 'reset-password', params: { token: token || undefined } };
    }

    if (path === '/verify-email') {
      const token = urlParams.get('token');
      return { path, page: 'verify-email', params: { token: token || undefined } };
    }

    if (path === '/privacy') {
      return { path, page: 'privacy', params: {} };
    }

    if (path === '/terms') {
      return { path, page: 'terms', params: {} };
    }

    const examMatch = path.match(/^\/exam\/([^/]+)$/);
    if (examMatch) {
      return {
        path,
        page: 'viewer',
        params: { examId: examMatch[1] },
      };
    }

    // Default route (/ or other)
    return { path: '/', page: 'exams', params: {} };
  }

  // Navigate to a new route
  const navigate = useCallback(
    (page: Route['page'], params: RouteParams = {}) => {
      const newPath = buildPath(page, params);
      if (!newPath) return; // buildPath already logged the error

      // Update URL without reloading the page
      window.history.pushState(null, '', newPath);

      // Synchronize all useRouter instances
      syncRouterInstances();

      // Update local state
      const newRoute: Route = { path: newPath, page, params };
      setCurrentRoute(newRoute);
    },
    [buildPath, syncRouterInstances]
  );

  // Listen for history changes (back button)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(parseCurrentPath());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update page title based on the route
  useEffect(() => {
    let title = instanceName;

    switch (currentRoute.page) {
      case 'upload':
        title = `Upload | ${instanceName}`;
        break;
      case 'admin-reports':
        title = `Reports | ${instanceName}`;
        break;
      case 'admin-users':
        title = `Users | ${instanceName}`;
        break;
      case 'profile':
        title = `Profile | ${instanceName}`;
        break;
      case 'privacy':
        title = `Privacy Policy | ${instanceName}`;
        break;
      case 'terms':
        title = `Terms of Service | ${instanceName}`;
        break;
      case 'viewer':
        title = `Exam | ${instanceName}`;
        break;
      case 'login':
        title = `Sign in | ${instanceName}`;
        break;
      case 'register':
        title = `Create account | ${instanceName}`;
        break;
      case 'forgot-password':
        title = `Forgot password | ${instanceName}`;
        break;
      case 'verify-email':
        title = `Verification | ${instanceName}`;
        break;
      case 'exams':
      default:
        title = `Exams | ${instanceName}`;
        break;
    }

    document.title = title;
  }, [currentRoute, instanceName]);

  // Replace the current URL (useful for redirects)
  const replace = useCallback(
    (page: Route['page'], params: RouteParams = {}) => {
      const newPath = buildPath(page, params);
      if (!newPath) return; // buildPath already logged the error

      // Replace the current URL
      window.history.replaceState(null, '', newPath);

      // Synchronize all useRouter instances
      syncRouterInstances();

      // Update local state
      const newRoute: Route = { path: newPath, page, params };
      setCurrentRoute(newRoute);
    },
    [buildPath, syncRouterInstances]
  );

  // Memoize helper functions
  const isPage = useCallback(
    (page: Route['page']) => currentRoute.page === page,
    [currentRoute.page]
  );
  const getExamId = useCallback(() => currentRoute.params.examId, [currentRoute.params.examId]);

  return {
    currentRoute,
    navigate,
    replace,
    isPage,
    getExamId,
  };
}
