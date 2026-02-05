import fs from 'fs';
import { InstanceConfig, instanceConfigSchema, PublicInstanceConfig } from '../types/instance-config.js';

/**
 * Service for loading and validating instance configuration
 */
class InstanceConfigService {
  private config: InstanceConfig | null = null;
  private configPath: string;

  constructor() {
    // Config file is mounted at /config/instance.config.json in container (outside /app to avoid bind mount conflicts)
    this.configPath = '/config/instance.config.json';
  }

  /**
   * Load and validate instance configuration from file
   * Falls back to example config if main config doesn't exist
   * @throws Error if config is invalid or both files are missing
   */
  loadConfig(): InstanceConfig {
    if (this.config) {
      return this.config;
    }

    let configFile = this.configPath;

    // If instance.config.json doesn't exist, try to use the example
    if (!fs.existsSync(configFile)) {
      console.warn(`Instance config not found at ${configFile}, using example config`);
      configFile = '/config/instance.config.example.json';

      if (!fs.existsSync(configFile)) {
        throw new Error('Neither instance.config.json nor instance.config.example.json found');
      }
    }

    try {
      const fileContent = fs.readFileSync(configFile, 'utf-8');
      const rawConfig = JSON.parse(fileContent);

      // Validate config against schema
      const result = instanceConfigSchema.safeParse(rawConfig);

      if (!result.success) {
        console.error('Instance config validation failed:', result.error.format());
        throw new Error(`Invalid instance configuration: ${result.error.message}`);
      }

      this.config = result.data;
      console.log(`✓ Instance config loaded successfully: ${this.config.instance.name}`);

      return this.config;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in instance config: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get the current loaded configuration
   * @throws Error if config hasn't been loaded yet
   */
  getConfig(): InstanceConfig {
    if (!this.config) {
      throw new Error('Instance config not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Get public configuration safe to expose to frontend
   * With simplified schema, public config = full config
   */
  getPublicConfig(): PublicInstanceConfig {
    return this.getConfig();
  }

  /**
   * Check if an email domain is allowed based on instance config
   */
  isEmailDomainAllowed(email: string): boolean {
    const config = this.getConfig();
    const emailLower = email.toLowerCase();

    return config.email.allowedDomains.some((domain) => emailLower.endsWith(domain.toLowerCase()));
  }
}

// Singleton instance
export const instanceConfigService = new InstanceConfigService();
