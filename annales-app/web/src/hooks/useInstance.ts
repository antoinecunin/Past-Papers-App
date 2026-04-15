import { useContext } from 'react';
import { InstanceContext } from '../contexts/instanceContext';

/**
 * Hook to access current instance configuration
 */
export const useInstance = () => {
  const context = useContext(InstanceContext);
  if (context === undefined) {
    throw new Error('useInstance must be used within InstanceProvider');
  }
  const { config, isLoading, error } = context;

  return {
    name: config.instance.name,
    organizationName: config.instance.organizationName,
    contactEmail: config.instance.contactEmail,
    allowedDomains: config.email.allowedDomains,
    maxFileSizeMB: config.uploads?.maxFileSizeMB ?? 50,
    isLoading,
    error,
  };
};
