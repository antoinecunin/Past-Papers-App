import request from 'supertest';
import express from 'express';
import { router as filesRouter } from '../../routes/files.js';
import { createAuthenticatedUser, testEmail } from '../helpers/auth.helper.js';
import { UserModel } from '../../models/User.js';
import { errorHandler } from '../../middleware/errorHandler.js';

// Minimal valid 1x1 red PNG (67 bytes)
const VALID_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64'
);

describe('POST /api/files/image', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/files', filesRouter);
    app.use(errorHandler);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/files/image')
      .attach('image', VALID_PNG, 'test.png');

    expect(response.status).toBe(401);
  });

  it('should reject request without file', async () => {
    const { token } = await createAuthenticatedUser({ email: testEmail('img-nofile') });

    const response = await request(app)
      .post('/api/files/image')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing image');
  });

  it('should reject non-image file', async () => {
    const { token } = await createAuthenticatedUser({ email: testEmail('img-notimg') });

    const response = await request(app)
      .post('/api/files/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from('not an image'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Only image files');
  });

  it('should upload and return a key', async () => {
    const { token } = await createAuthenticatedUser({ email: testEmail('img-upload') });

    const response = await request(app)
      .post('/api/files/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', VALID_PNG, { filename: 'test.png', contentType: 'image/png' });

    expect(response.status).toBe(200);
    expect(response.body.key).toMatch(/^images\/[0-9a-f-]+\.webp$/);
  });

  it('should reject when canComment is false', async () => {
    const { user, token } = await createAuthenticatedUser({ email: testEmail('img-muted') });
    await UserModel.findByIdAndUpdate(user._id, { canComment: false });

    const response = await request(app)
      .post('/api/files/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', VALID_PNG, { filename: 'test.png', contentType: 'image/png' });

    expect(response.status).toBe(403);
  });
});

describe('GET /api/files/image/:filename', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/files', filesRouter);
    app.use(errorHandler);
  });

  it('should reject invalid filename', async () => {
    const response = await request(app).get('/api/files/image/not-a-uuid');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid filename');
  });

  it('should serve image with valid UUID filename (mock S3)', async () => {
    // With mocked S3, any valid UUID filename returns 200
    const response = await request(app).get(
      '/api/files/image/00000000-0000-0000-0000-000000000000.webp'
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/webp');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});
