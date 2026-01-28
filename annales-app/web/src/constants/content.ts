import type { ContentType } from '../types/answer';

/**
 * Limites de longueur par type de contenu (synchronisées avec le backend)
 */
export const CONTENT_MAX_LENGTH: Record<ContentType, number> = {
  text: 50_000,   // 50k caractères pour du texte
  image: 10_000,  // 10k caractères (URLs uniquement, pas de data URIs)
  latex: 10_000,  // 10k caractères pour du LaTeX
};

/**
 * Domaines autorisés pour les images (synchronisés avec le backend)
 */
export const ALLOWED_IMAGE_HOSTS = [
  'i.imgur.com',
  'imgur.com',
  'i.ibb.co',
  'ibb.co',
  'i.postimg.cc',
  'postimg.cc',
] as const;

/**
 * Vérifie si une URL d'image provient d'un domaine autorisé
 */
export function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_IMAGE_HOSTS.some(host =>
      parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
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
  if (ratio >= 1) return '#dc2626'; // Rouge - limite dépassée
  if (ratio >= 0.9) return '#f59e0b'; // Orange - proche de la limite
  return '#6b7280'; // Gris - OK
}
