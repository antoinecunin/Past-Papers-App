import { useState, useEffect, useCallback } from 'react';

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
 * Hook pour gérer le routing simple avec l'API History
 * Supporte les routes: /, /upload, /exam/:examId
 */
export function useRouter() {
  const [currentRoute, setCurrentRoute] = useState<Route>(() => parseCurrentPath());

  /**
   * Helper pour construire le path d'une route
   * @param page - Type de page à construire
   * @param params - Paramètres de la route (examId, token, etc.)
   * @returns Le path de la route ou null en cas d'erreur
   */
  const buildPath = useCallback((page: Route['page'], params: RouteParams = {}) => {
    switch (page) {
      case 'upload':
        return '/upload';
      case 'profile':
        return '/profile';
      case 'admin-reports':
        return '/admin/reports';
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
          console.error('examId requis pour la route viewer');
          return null;
        }
        return `/exam/${params.examId}`;
      case 'exams':
      default:
        return '/';
    }
  }, []);

  /**
   * Helper pour synchroniser toutes les instances de useRouter
   * Déclenche manuellement un événement popstate pour notifier les autres hooks
   */
  const syncRouterInstances = useCallback(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  /**
   * Parser le path actuel en route
   * @returns L'objet Route correspondant au path actuel
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

    // Route par défaut (/ ou autre)
    return { path: '/', page: 'exams', params: {} };
  }

  // Naviguer vers une nouvelle route
  const navigate = useCallback(
    (page: Route['page'], params: RouteParams = {}) => {
      const newPath = buildPath(page, params);
      if (!newPath) return; // buildPath a déjà loggé l'erreur

      // Mettre à jour l'URL sans recharger la page
      window.history.pushState(null, '', newPath);

      // Synchroniser toutes les instances de useRouter
      syncRouterInstances();

      // Mettre à jour l'état local
      const newRoute: Route = { path: newPath, page, params };
      setCurrentRoute(newRoute);
    },
    [buildPath, syncRouterInstances]
  );

  // Écouter les changements de l'historique (bouton retour)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(parseCurrentPath());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Mettre à jour le titre de la page selon la route
  useEffect(() => {
    let title = "Plateforme d'Annales";

    switch (currentRoute.page) {
      case 'upload':
        title = "Upload - Plateforme d'Annales";
        break;
      case 'admin-reports':
        title = "Signalements - Plateforme d'Annales";
        break;
      case 'profile':
        title = "Mon Profil - Plateforme d'Annales";
        break;
      case 'privacy':
        title = "Politique de Confidentialité - Plateforme d'Annales";
        break;
      case 'terms':
        title = "Conditions Générales d'Utilisation - Plateforme d'Annales";
        break;
      case 'viewer':
        title = "Examen - Plateforme d'Annales";
        break;
      case 'exams':
      default:
        title = "Examens - Plateforme d'Annales";
        break;
    }

    document.title = title;
  }, [currentRoute]);

  // Remplacer l'URL actuelle (utile pour redirection)
  const replace = useCallback(
    (page: Route['page'], params: RouteParams = {}) => {
      const newPath = buildPath(page, params);
      if (!newPath) return; // buildPath a déjà loggé l'erreur

      // Remplacer l'URL actuelle
      window.history.replaceState(null, '', newPath);

      // Synchroniser toutes les instances de useRouter
      syncRouterInstances();

      // Mettre à jour l'état local
      const newRoute: Route = { path: newPath, page, params };
      setCurrentRoute(newRoute);
    },
    [buildPath, syncRouterInstances]
  );

  // Mémoriser les fonctions helper
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
