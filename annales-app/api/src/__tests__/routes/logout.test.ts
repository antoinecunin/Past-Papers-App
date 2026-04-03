import request from 'supertest';
import express from 'express';
import { router as authRouter } from '../../routes/auth.js';
import { UserModel } from '../../models/User.js';
import { createAuthenticatedUser, testEmail } from '../helpers/auth.helper.js';
import { errorHandler } from '../../middleware/errorHandler.js';

describe('POST /api/auth/logout', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use(errorHandler);
  });

  it('should require authentication', async () => {
    const response = await request(app).post('/api/auth/logout');
    expect(response.status).toBe(401);
  });

  it('should increment tokenVersion', async () => {
    const { user, token } = await createAuthenticatedUser({ email: testEmail('logout-test') });

    const before = await UserModel.findById(user._id);
    expect(before!.tokenVersion).toBe(0);

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    const after = await UserModel.findById(user._id);
    expect(after!.tokenVersion).toBe(1);
  });

  it('should invalidate the token after logout', async () => {
    const { token } = await createAuthenticatedUser({ email: testEmail('logout-invalid') });

    // Logout
    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);

    // Try to use the same token
    const response = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Session expired');
  });
});
