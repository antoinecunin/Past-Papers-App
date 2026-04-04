import { z } from 'zod';

/**
 * Validation schema for instance configuration (KISS principle)
 * Only truly variable settings per instance
 */
export const instanceConfigSchema = z.object({
  instance: z.object({
    name: z.string().min(1, 'Instance name is required'),
    organizationName: z.string().min(1, 'Organization name is required'),
    contactEmail: z.string().email('Valid contact email is required'),
  }),
  email: z.object({
    allowedDomains: z
      .array(z.string().regex(/^@[\w.-]+\.\w+$/, 'Invalid domain format'))
      .min(1, 'At least one allowed domain is required'),
  }),
});

export type InstanceConfig = z.infer<typeof instanceConfigSchema>;

/**
 * Public config exposed to frontend (same as full config - no secrets)
 */
export const publicConfigSchema = instanceConfigSchema;

export type PublicInstanceConfig = z.infer<typeof publicConfigSchema>;
