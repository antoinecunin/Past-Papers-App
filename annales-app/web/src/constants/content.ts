import type { ContentType } from '../types/answer';

/**
 * Limites de longueur par type de contenu (synchronisées avec le backend)
 */
export const CONTENT_MAX_LENGTH: Record<ContentType, number> = {
  text: 50_000,
  image: 200, // Clé S3 uniquement
  latex: 10_000,
};

/** Taille max d'upload image (5 Mo) */
export const IMAGE_MAX_SIZE = 5 * 1024 * 1024;

/**
 * Construit l'URL de téléchargement d'une image depuis sa clé S3
 */
export function imageKeyToUrl(key: string): string {
  const filename = key.split('/').pop() ?? key;
  return `/api/files/image/${filename}`;
}

/**
 * Formate le compteur de caractères (ex: "1 234 / 50 000")
 */
export function formatCharCount(current: number, max: number): string {
  return `${current.toLocaleString('fr-FR')} / ${max.toLocaleString('fr-FR')}`;
}

/**
 * Retourne la couleur du compteur selon le pourcentage utilisé
 */
export function getCharCountColor(current: number, max: number): string {
  const ratio = current / max;
  if (ratio >= 1) return '#dc2626';
  if (ratio >= 0.9) return '#f59e0b';
  return '#6b7280';
}
