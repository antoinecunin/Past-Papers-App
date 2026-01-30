/** Limites de longueur par type de contenu */
export const CONTENT_MAX_LENGTH = {
  text: 50_000,
  image: 10_000,
  latex: 10_000,
} as const;

/** Domaines autorisés pour les images */
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
    return ALLOWED_IMAGE_HOSTS.some(
      host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}
