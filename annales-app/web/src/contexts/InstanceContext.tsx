import { useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_INSTANCE_CONFIG, type InstanceConfig } from '../types/instance-config';
import { InstanceContext } from './instanceContext';

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
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-3 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          <span className="text-gray-600 text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <InstanceContext.Provider value={{ config, isLoading, error }}>
      {children}
    </InstanceContext.Provider>
  );
}
