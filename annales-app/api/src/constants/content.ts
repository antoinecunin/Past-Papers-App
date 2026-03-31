/** Limites de longueur par type de contenu */
export const CONTENT_MAX_LENGTH = {
  text: 50_000,
  image: 200, // Clé S3 (ex: "images/550e8400-e29b-41d4-a716-446655440000.webp")
  latex: 10_000,
} as const;

/**
 * Vérifie qu'une clé d'image est au format attendu (images/<uuid>.webp)
 */
export function isValidImageKey(key: string): boolean {
  return /^images\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/.test(key);
}
