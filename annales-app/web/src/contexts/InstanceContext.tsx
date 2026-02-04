import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_INSTANCE_CONFIG, type InstanceConfig } from '../types/instance-config';

interface InstanceContextType {
  config: InstanceConfig;
  isLoading: boolean;
  error: string | null;
}

const InstanceContext = createContext<InstanceContextType | undefined>(undefined);

/**
 * Provider component that loads instance configuration from the API
 * Falls back to default config if API call fails
 */
export function InstanceProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<InstanceConfig>(DEFAULT_INSTANCE_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Use relative path - nginx reverse proxy routes /api/* to backend
        const response = await fetch('/api/config/instance');

        if (!response.ok) {
          throw new Error(`Failed to load instance config: ${response.statusText}`);
        }

        const data = await response.json();
        setConfig(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load instance config, using defaults:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Keep using DEFAULT_INSTANCE_CONFIG as fallback
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  return (
    <InstanceContext.Provider value={{ config, isLoading, error }}>
      {children}
    </InstanceContext.Provider>
  );
}

/**
 * Hook to access instance configuration
 * Provides instance name, branding, features, and legal info
 */
export function useInstanceContext() {
  const context = useContext(InstanceContext);
  if (context === undefined) {
    throw new Error('useInstanceContext must be used within InstanceProvider');
  }
  return context;
}
