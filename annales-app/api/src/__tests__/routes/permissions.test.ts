import request from 'supertest';
import express from 'express';
import { router as authRouter } from '../../routes/auth.js';
import { router as answersRouter } from '../../routes/answers.js';
import { Exam as ExamModel } from '../../models/Exam.js';
import { UserModel } from '../../models/User.js';
import { createAuthenticatedUser, testEmail } from '../helpers/auth.helper.js';
import { createExamData } from '../fixtures/exam.fixture.js';
import { errorHandler } from '../../middleware/errorHandler.js';

describe('User permissions', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use('/api/answers', answersRouter);
    app.use(errorHandler);
  });

  describe('PUT /api/auth/users/:id/permissions', () => {
    it('should require admin', async () => {
      const { token } = await createAuthenticatedUser({ email: testEmail('perm-user') });
      const { user: target } = await createAuthenticatedUser({ email: testEmail('perm-target') });

      const response = await request(app)
        .put(`/api/auth/users/${target._id}/permissions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ canComment: false });

      expect(response.status).toBe(403);
    });

    it('should toggle canComment', async () => {
      const { token } = await createAuthenticatedUser({
        email: testEmail('perm-admin1'),
        role: 'admin',
      });
      const { user: target } = await createAuthenticatedUser({ email: testEmail('perm-t1') });

      const response = await request(app)
        .put(`/api/auth/users/${target._id}/permissions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ canComment: false });

      expect(response.status).toBe(200);
      expect(response.body.user.canComment).toBe(false);

      const updated = await UserModel.findById(target._id);
      expect(updated!.canComment).toBe(false);
    });

    it('should toggle canUpload', async () => {
      const { token } = await createAuthenticatedUser({
        email: testEmail('perm-admin2'),
        role: 'admin',
      });
      const { user: target } = await createAuthenticatedUser({ email: testEmail('perm-t2') });

      const response = await request(app)
        .put(`/api/auth/users/${target._id}/permissions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ canUpload: false });

      expect(response.status).toBe(200);
      expect(response.body.user.canUpload).toBe(false);
    });

    it('should reject changing own permissions', async () => {
      const { user: admin, token } = await createAuthenticatedUser({
        email: testEmail('perm-admin-self'),
        role: 'admin',
      });

      const response = await request(app)
        .put(`/api/auth/users/${admin._id}/permissions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ canComment: false });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('own permissions');
    });

    it('should reject changing admin permissions', async () => {
      const { token } = await createAuthenticatedUser({
        email: testEmail('perm-admin3'),
        role: 'admin',
      });
      const { user: otherAdmin } = await createAuthenticatedUser({
        email: testEmail('perm-admin-other'),
        role: 'admin',
      });

      const response = await request(app)
        .put(`/api/auth/users/${otherAdmin._id}/permissions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ canComment: false });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('admin');
    });
  });

  describe('Permission enforcement', () => {
    it('should reject comment creation when canComment is false', async () => {
      const { user, token } = await createAuthenticatedUser({ email: testEmail('muted-user') });
      await UserModel.findByIdAndUpdate(user._id, { canComment: false });

      const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          examId: exam._id.toString(),
          page: 1,
          yTop: 0.5,
          content: { type: 'text', data: 'test' },
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('commenting');
    });

    it('should allow comment creation when canComment is true', async () => {
      const { user, token } = await createAuthenticatedUser({ email: testEmail('normal-user') });
      const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          examId: exam._id.toString(),
          page: 1,
          yTop: 0.5,
          content: { type: 'text', data: 'test' },
        });

      expect(response.status).toBe(200);
    });
  });
});
