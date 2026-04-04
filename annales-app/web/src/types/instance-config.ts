/**
 * Instance configuration types (frontend)
 * Matches backend PublicInstanceConfig
 */

export interface InstanceConfig {
  instance: {
    name: string;
    organizationName: string;
    contactEmail: string;
  };
  email: {
    allowedDomains: string[];
  };
}

/**
 * Default fallback configuration
 * Used if API call fails or before config is loaded
 */
export const DEFAULT_INSTANCE_CONFIG: InstanceConfig = {
  instance: {
    name: 'Exam Archive',
    organizationName: 'My University',
    contactEmail: 'contact@example.com',
  },
  email: {
    allowedDomains: ['@students.example.edu'],
  },
};
