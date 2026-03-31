import request from 'supertest';
import express from 'express';
import { Types } from 'mongoose';
import { router as answersRouter } from '../../routes/answers.js';
import { Exam as ExamModel } from '../../models/Exam.js';
import { AnswerModel } from '../../models/Answer.js';
import { createAuthenticatedUser, testEmail } from '../helpers/auth.helper.js';
import { createExamData } from '../fixtures/exam.fixture.js';
import { createAnswerData } from '../fixtures/answer.fixture.js';
import { errorHandler } from '../../middleware/errorHandler.js';

describe('PUT /api/answers/:id/best', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/answers', answersRouter);
    app.use(errorHandler);
  });

  it('should require authentication', async () => {
    const id = new Types.ObjectId();
    const response = await request(app).put(`/api/answers/${id}/best`);
    expect(response.status).toBe(401);
  });

  it('should reject non-admin users', async () => {
    const { user, token } = await createAuthenticatedUser({ email: testEmail('best-user') });
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const answer = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id })
    );

    const response = await request(app)
      .put(`/api/answers/${answer._id}/best`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('should toggle isBestAnswer to true', async () => {
    const { user, token } = await createAuthenticatedUser({
      email: testEmail('best-admin'),
      role: 'admin',
    });
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const answer = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id })
    );

    const response = await request(app)
      .put(`/api/answers/${answer._id}/best`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.isBestAnswer).toBe(true);

    const updated = await AnswerModel.findById(answer._id);
    expect(updated!.isBestAnswer).toBe(true);
  });

  it('should toggle isBestAnswer back to false', async () => {
    const { user, token } = await createAuthenticatedUser({
      email: testEmail('best-admin-toggle'),
      role: 'admin',
    });
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const answer = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id, isBestAnswer: true })
    );

    const response = await request(app)
      .put(`/api/answers/${answer._id}/best`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.isBestAnswer).toBe(false);
  });

  it('should reject replies (only root comments)', async () => {
    const { user, token } = await createAuthenticatedUser({
      email: testEmail('best-admin-reply'),
      role: 'admin',
    });
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const root = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id })
    );
    const reply = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id, parentId: root._id })
    );

    const response = await request(app)
      .put(`/api/answers/${reply._id}/best`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('racines');
  });

  it('should return 404 for non-existent answer', async () => {
    const { token } = await createAuthenticatedUser({
      email: testEmail('best-admin-404'),
      role: 'admin',
    });
    const id = new Types.ObjectId();

    const response = await request(app)
      .put(`/api/answers/${id}/best`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});
