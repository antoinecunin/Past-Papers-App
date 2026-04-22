import { z } from 'zod';

/**
 * Schema for every environment variable the API reads at runtime.
 *
 * Hard requirements (app cannot boot without a real value):
 * - MONGO_URI, JWT_SECRET, S3_* — the app literally cannot function.
 *
 * Soft defaults: ports, retry counts, log level — same in dev and prod.
 *
 * Optional without defaults: SMTP_*, MEILI_*, INITIAL_ADMIN_* — features
 * degrade gracefully when absent (emails stop working, search stops
 * indexing, no admin bootstrapped — but the app still boots).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Hard requirements
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  S3_ENDPOINT: z.string().min(1, 'S3_ENDPOINT is required'),
  S3_REGION: z.string().min(1, 'S3_REGION is required'),
  S3_BUCKET: z.string().min(1, 'S3_BUCKET is required'),
  S3_ACCESS_KEY: z.string().min(1, 'S3_ACCESS_KEY is required'),
  S3_SECRET_KEY: z.string().min(1, 'S3_SECRET_KEY is required'),
  S3_USE_SSL: z
    .string()
    .optional()
    .transform(v => v === 'true'),

  // Networking & logging — sane defaults
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().default(3000),
  API_LOG_LEVEL: z.string().default('dev'),
  CORS_ORIGIN: z.string().default(''),
  FRONTEND_URL: z.string().default(''),

  // JWT config
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Mongo retry loop
  MONGO_RETRY_MS: z.coerce.number().int().default(2000),
  MONGO_MAX_RETRIES: z.coerce.number().int().default(60),

  // Meili — optional but with working defaults that match our compose
  MEILI_HOST: z.string().default('http://meili:7700'),
  MEILI_INDEX: z.string().default('papers'),
  MEILI_MASTER_KEY: z.string().optional(),

  // SMTP — entirely optional; email verification degrades to a warning.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform(v => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().optional(),

  // First admin bootstrap — all optional, skipped if any is missing.
  INITIAL_ADMIN_EMAIL: z.string().optional(),
  INITIAL_ADMIN_PASSWORD: z.string().optional(),
  INITIAL_ADMIN_FIRSTNAME: z.string().optional(),
  INITIAL_ADMIN_LASTNAME: z.string().optional(),

  // Instance config location (override in tests or custom deployments)
  INSTANCE_CONFIG_PATH: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate process.env against the schema and return a typed env object.
 * Exits the process with a readable message on failure — there's no
 * graceful recovery from a missing required variable at boot.
 *
 * Skipped under NODE_ENV === 'test' because test setup injects its own
 * env values via setup-mocks.ts with different constraints.
 */
export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (source.NODE_ENV === 'test') {
    return envSchema.parse(source);
  }
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const lines = result.error.errors.map(e => `  - ${e.path.join('.') || '(root)'}: ${e.message}`);
    console.error(`[env] invalid environment configuration:\n${lines.join('\n')}`);
    process.exit(1);
  }
  return result.data;
}
