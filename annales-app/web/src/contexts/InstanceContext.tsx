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

  // Inject CSS variables as soon as config is loaded
  useEffect(() => {
    const primaryColor = config.branding.primaryColor;

    // Calculate hover color (darken by 10%)
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 37, g: 99, b: 235 };
    };

    const rgb = hexToRgb(primaryColor);
    const primaryHoverColor = `#${Math.floor(rgb.r * 0.9).toString(16).padStart(2, '0')}${Math.floor(rgb.g * 0.9).toString(16).padStart(2, '0')}${Math.floor(rgb.b * 0.9).toString(16).padStart(2, '0')}`;
    const primaryLight = `rgb(${Math.min(255, rgb.r + (255 - rgb.r) * 0.9)}, ${Math.min(255, rgb.g + (255 - rgb.g) * 0.9)}, ${Math.min(255, rgb.b + (255 - rgb.b) * 0.9)})`;

    // Inject CSS variables
    document.documentElement.style.setProperty('--color-primary', primaryColor);
    document.documentElement.style.setProperty('--color-primary-hover', primaryHoverColor);
    document.documentElement.style.setProperty('--color-primary-light', primaryLight);
  }, [config]);

  // Show loading state while fetching config to prevent flash of default colors
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-3 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          <span className="text-gray-600 text-lg">Chargement...</span>
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
