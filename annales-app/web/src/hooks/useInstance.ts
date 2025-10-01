/**
 * Hook pour accéder aux informations de l'instance actuelle
 * Permet le support multi-instances (une par formation)
 * Les valeurs viennent des variables d'environnement
 */
export const useInstance = () => {
  return {
    name: import.meta.env.VITE_INSTANCE_NAME || "Annales - Université de Strasbourg",
    shortName: import.meta.env.VITE_INSTANCE_SHORT_NAME || "Annales",
    logoPath: import.meta.env.VITE_LOGO_PATH || "/logo.svg",
  };
};
