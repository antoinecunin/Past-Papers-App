import { useState, useEffect, useCallback } from 'react';

export interface RouteParams {
  examId?: string;
}

export interface Route {
  path: string;
  page: 'upload' | 'exams' | 'viewer';
  params: RouteParams;
}

/**
 * Hook pour gérer le routing simple avec l'API History
 * Supporte les routes: /, /upload, /exam/:examId
 */
export function useRouter() {
  const [currentRoute, setCurrentRoute] = useState<Route>(() => parseCurrentPath());

  // Parser le path actuel en route
  function parseCurrentPath(): Route {
    const path = window.location.pathname;

    if (path === '/upload') {
      return { path, page: 'upload', params: {} };
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
  const navigate = useCallback((page: Route['page'], params: RouteParams = {}) => {
    let newPath: string;

    switch (page) {
      case 'upload':
        newPath = '/upload';
        break;
      case 'viewer':
        if (!params.examId) {
          console.error('examId requis pour la route viewer');
          return;
        }
        newPath = `/exam/${params.examId}`;
        break;
      case 'exams':
      default:
        newPath = '/';
        break;
    }

    // Mettre à jour l'URL sans recharger la page
    window.history.pushState(null, '', newPath);

    // Mettre à jour l'état local
    const newRoute: Route = { path: newPath, page, params };
    setCurrentRoute(newRoute);
  }, []);

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
  const replace = useCallback((page: Route['page'], params: RouteParams = {}) => {
    let newPath: string;

    switch (page) {
      case 'upload':
        newPath = '/upload';
        break;
      case 'viewer':
        if (!params.examId) {
          console.error('examId requis pour la route viewer');
          return;
        }
        newPath = `/exam/${params.examId}`;
        break;
      case 'exams':
      default:
        newPath = '/';
        break;
    }

    // Remplacer l'URL actuelle
    window.history.replaceState(null, '', newPath);

    // Mettre à jour l'état local
    const newRoute: Route = { path: newPath, page, params };
    setCurrentRoute(newRoute);
  }, []);

  return {
    currentRoute,
    navigate,
    replace,
    // Helpers pour vérifier la page actuelle
    isPage: (page: Route['page']) => currentRoute.page === page,
    getExamId: () => currentRoute.params.examId,
  };
}
