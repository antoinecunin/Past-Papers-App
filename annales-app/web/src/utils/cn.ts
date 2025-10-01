import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utilitaire pour fusionner des classes Tailwind de manière intelligente
 * Combine clsx (pour les conditionnelles) et tailwind-merge (pour éviter les conflits)
 *
 * @example
 * cn('px-2 py-1', isActive && 'bg-primary', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
