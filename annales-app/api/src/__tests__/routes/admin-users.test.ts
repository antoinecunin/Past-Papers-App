import request from 'supertest';
import express from 'express';
import { router as authRouter } from '../../routes/auth.js';
import { UserModel } from '../../models/User.js';
import { createAuthenticatedUser, testEmail } from '../helpers/auth.helper.js';
import { errorHandler } from '../../middleware/errorHandler.js';

/**
 * Tests pour GET /api/auth/users et PUT /api/auth/users/:id/role
 */
describe('Admin user management', () => {
  let app: express.Application;
  const originalEnv = process.env.INITIAL_ADMIN_EMAIL;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use(errorHandler);
  });

  afterEach(() => {
    // Restore env
    process.env.INITIAL_ADMIN_EMAIL = originalEnv;
  });

  describe('GET /api/auth/users', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/auth/users');
      expect(response.status).toBe(401);
    });

    it('should reject non-admin users', async () => {
      const { token } = await createAuthenticatedUser({ email: testEmail('user-list') });

      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it('should return list of users for admin', async () => {
      const { token } = await createAuthenticatedUser({
        email: testEmail('admin-list'),
        role: 'admin',
      });
      // Create a regular user
      await createAuthenticatedUser({ email: testEmail('regular') });

      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThanOrEqual(2);
      expect(response.body).toHaveProperty('canManageRoles');
      // Should not expose password
      expect(response.body.users[0]).not.toHaveProperty('password');
      // Should have expected fields
      expect(response.body.users[0]).toHaveProperty('email');
      expect(response.body.users[0]).toHaveProperty('firstName');
      expect(response.body.users[0]).toHaveProperty('role');
    });

    it('should return canManageRoles=true for initial admin', async () => {
      const initialEmail = testEmail('init-admin-can-manage');
      process.env.INITIAL_ADMIN_EMAIL = initialEmail;

      const { token } = await createAuthenticatedUser({
        email: initialEmail,
        role: 'admin',
      });

      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.canManageRoles).toBe(true);
    });

    it('should return canManageRoles=false for non-initial admin', async () => {
      process.env.INITIAL_ADMIN_EMAIL = testEmail('someone-else');

      const { token } = await createAuthenticatedUser({
        email: testEmail('other-admin-can'),
        role: 'admin',
      });

      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.canManageRoles).toBe(false);
    });
  });

  describe('PUT /api/auth/users/:id/role', () => {
    it('should require authentication', async () => {
      const response = await request(app).put('/api/auth/users/123/role').send({ role: 'admin' });

      expect(response.status).toBe(401);
    });

    it('should reject non-admin users', async () => {
      const { token } = await createAuthenticatedUser({ email: testEmail('user-role') });

      const response = await request(app)
        .put('/api/auth/users/123/role')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(403);
    });

    it('should reject admin who is not the initial admin', async () => {
      const adminEmail = testEmail('other-admin');
      process.env.INITIAL_ADMIN_EMAIL = testEmail('initial-admin');

      const { token } = await createAuthenticatedUser({
        email: adminEmail,
        role: 'admin',
      });
      const { user: target } = await createAuthenticatedUser({ email: testEmail('target1') });

      const response = await request(app)
        .put(`/api/auth/users/${target._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('initial admin');
    });

    it('should allow the initial admin to promote a user to admin', async () => {
      const initialEmail = testEmail('init-admin-promote');
      process.env.INITIAL_ADMIN_EMAIL = initialEmail;

      const { token } = await createAuthenticatedUser({
        email: initialEmail,
        role: 'admin',
      });
      const { user: target } = await createAuthenticatedUser({
        email: testEmail('promote-target'),
      });

      const response = await request(app)
        .put(`/api/auth/users/${target._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe('admin');

      // Verify in DB
      const updated = await UserModel.findById(target._id);
      expect(updated!.role).toBe('admin');
    });

    it('should allow the initial admin to demote an admin to user', async () => {
      const initialEmail = testEmail('init-admin-demote');
      process.env.INITIAL_ADMIN_EMAIL = initialEmail;

      const { token } = await createAuthenticatedUser({
        email: initialEmail,
        role: 'admin',
      });
      const { user: target } = await createAuthenticatedUser({
        email: testEmail('demote-target'),
        role: 'admin',
      });

      const response = await request(app)
        .put(`/api/auth/users/${target._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'user' });

      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe('user');
    });

    it('should reject changing own role', async () => {
      const initialEmail = testEmail('init-admin-self');
      process.env.INITIAL_ADMIN_EMAIL = initialEmail;

      const { user, token } = await createAuthenticatedUser({
        email: initialEmail,
        role: 'admin',
      });

      const response = await request(app)
        .put(`/api/auth/users/${user._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'user' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('own role');
    });

    it('should reject changing the initial admin role (even by themselves via another check)', async () => {
      const initialEmail = testEmail('init-admin-protect');
      process.env.INITIAL_ADMIN_EMAIL = initialEmail;

      // Create the initial admin
      const { token } = await createAuthenticatedUser({
        email: initialEmail,
        role: 'admin',
      });

      // Create another admin who happens to have the initial admin email in DB
      // This case is already covered by "cannot change own role"
      // But let's test the explicit protection: find the initial admin user
      const initialAdmin = await UserModel.findOne({ email: initialEmail });

      const response = await request(app)
        .put(`/api/auth/users/${initialAdmin!._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'user' });

      // Should be blocked by "cannot change own role"
      expect(response.status).toBe(400);
    });

    it('should reject invalid role value', async () => {
      const initialEmail = testEmail('init-admin-invalid');
      process.env.INITIAL_ADMIN_EMAIL = initialEmail;

      const { token } = await createAuthenticatedUser({
        email: initialEmail,
        role: 'admin',
      });
      const { user: target } = await createAuthenticatedUser({
        email: testEmail('invalid-role-target'),
      });

      const response = await request(app)
        .put(`/api/auth/users/${target._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'superadmin' });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      const initialEmail = testEmail('init-admin-404');
      process.env.INITIAL_ADMIN_EMAIL = initialEmail;

      const { token } = await createAuthenticatedUser({
        email: initialEmail,
        role: 'admin',
      });

      const response = await request(app)
        .put('/api/auth/users/000000000000000000000000/role')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(404);
    });
  });
});
