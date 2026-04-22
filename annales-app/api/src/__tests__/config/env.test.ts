import { parseEnv } from '../../config/env.js';

const validEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  MONGO_URI: 'mongodb://localhost:27017/test',
  JWT_SECRET: 'a-sufficiently-long-secret-for-tests',
  S3_ENDPOINT: 'localhost:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'annales',
  S3_ACCESS_KEY: 'key',
  S3_SECRET_KEY: 'secret',
};

describe('parseEnv', () => {
  it('returns a typed env with defaults applied', () => {
    const env = parseEnv(validEnv);
    expect(env.API_PORT).toBe(3000);
    expect(env.API_HOST).toBe('0.0.0.0');
    expect(env.MEILI_INDEX).toBe('papers');
    expect(env.MEILI_HOST).toBe('http://meili:7700');
    expect(env.JWT_EXPIRES_IN).toBe('7d');
  });

  it('coerces numeric env strings to numbers', () => {
    const env = parseEnv({ ...validEnv, API_PORT: '4242', MONGO_MAX_RETRIES: '10' });
    expect(env.API_PORT).toBe(4242);
    expect(env.MONGO_MAX_RETRIES).toBe(10);
  });

  it('accepts SMTP and admin bootstrap as optional', () => {
    expect(() => parseEnv(validEnv)).not.toThrow();
  });

  it('throws when MONGO_URI is missing (in test mode)', () => {
    const { MONGO_URI: _mongo, ...withoutMongo } = validEnv;
    void _mongo;
    expect(() => parseEnv(withoutMongo)).toThrow();
  });

  it('throws when JWT_SECRET is shorter than 16 chars', () => {
    expect(() => parseEnv({ ...validEnv, JWT_SECRET: 'short' })).toThrow();
  });

  it('transforms S3_USE_SSL and SMTP_SECURE to booleans', () => {
    const env = parseEnv({ ...validEnv, S3_USE_SSL: 'true', SMTP_SECURE: 'false' });
    expect(env.S3_USE_SSL).toBe(true);
    expect(env.SMTP_SECURE).toBe(false);
  });
});
