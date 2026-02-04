import { useInstanceContext } from '../contexts/InstanceContext';

/**
 * Hook pour accéder aux informations de l'instance actuelle
 * Support multi-instances (une par formation)
 * Les valeurs viennent de l'API /api/config/instance
 */
export const useInstance = () => {
  const { config, isLoading, error } = useInstanceContext();

  // Helper: calcule primaryHoverColor (darken de 10%)
  const getPrimaryHoverColor = (primaryColor: string): string => {
    // Convert hex to RGB
    const r = parseInt(primaryColor.slice(1, 3), 16);
    const g = parseInt(primaryColor.slice(3, 5), 16);
    const b = parseInt(primaryColor.slice(5, 7), 16);

    // Darken by 10% (multiply by 0.9)
    const darken = (val: number) => Math.round(val * 0.9);

    // Convert back to hex
    const toHex = (val: number) => val.toString(16).padStart(2, '0');
    return `#${toHex(darken(r))}${toHex(darken(g))}${toHex(darken(b))}`;
  };

  return {
    // Instance info
    name: config.instance.name,
    organizationName: config.instance.organizationName,
    contactEmail: config.instance.contactEmail,

    // Branding
    primaryColor: config.branding.primaryColor,
    primaryHoverColor: getPrimaryHoverColor(config.branding.primaryColor),

    // Email settings
    allowedDomains: config.email.allowedDomains,

    // Loading state
    isLoading,
    error,
  };
};
