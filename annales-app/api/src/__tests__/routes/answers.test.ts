import request from 'supertest';
import express from 'express';
import { router as answersRouter } from '../../routes/answers.js';
import { Exam as ExamModel } from '../../models/Exam.js';
import { AnswerModel } from '../../models/Answer.js';
import { createAuthenticatedUser } from '../helpers/auth.helper.js';
import { createExamData } from '../fixtures/exam.fixture.js';
import { createAnswerData } from '../fixtures/answer.fixture.js';

/**
 * Tests pour /api/answers
 */
describe('GET /api/answers', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/answers', answersRouter);
  });

  it('should require authentication', async () => {
    const response = await request(app).get('/api/answers?examId=123');

    expect(response.status).toBe(401);
  });

  it('should require examId parameter', async () => {
    const { token } = await createAuthenticatedUser();

    const response = await request(app)
      .get('/api/answers')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('examId');
  });

  it('should reject invalid examId', async () => {
    const { token } = await createAuthenticatedUser();

    const response = await request(app)
      .get('/api/answers?examId=invalid')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('ObjectId');
  });

  it('should return all answers for an exam', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    await AnswerModel.create([
      createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id }),
      createAnswerData({ examId: exam._id, page: 2, yTop: 0.3, authorId: user._id }),
    ]);

    const response = await request(app)
      .get(`/api/answers?examId=${exam._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it('should filter answers by page', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    await AnswerModel.create([
      createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id }),
      createAnswerData({ examId: exam._id, page: 1, yTop: 0.7, authorId: user._id }),
      createAnswerData({ examId: exam._id, page: 2, yTop: 0.3, authorId: user._id }),
    ]);

    const response = await request(app)
      .get(`/api/answers?examId=${exam._id}&page=1`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.every((a: { page: number }) => a.page === 1)).toBe(true);
  });

  it('should sort answers by page, yTop, and creation date', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    await AnswerModel.create([
      createAnswerData({ examId: exam._id, page: 2, yTop: 0.5, authorId: user._id }),
      createAnswerData({ examId: exam._id, page: 1, yTop: 0.7, authorId: user._id }),
      createAnswerData({ examId: exam._id, page: 1, yTop: 0.3, authorId: user._id }),
    ]);

    const response = await request(app)
      .get(`/api/answers?examId=${exam._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body[0].page).toBe(1);
    expect(response.body[0].yTop).toBe(0.3);
    expect(response.body[1].page).toBe(1);
    expect(response.body[1].yTop).toBe(0.7);
    expect(response.body[2].page).toBe(2);
  });
});

describe('POST /api/answers', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/answers', answersRouter);
  });

  it('should require authentication', async () => {
    const response = await request(app).post('/api/answers').send({});

    expect(response.status).toBe(401);
  });

  describe('Validation', () => {
    let token: string;
    let examId: string;

    beforeEach(async () => {
      const { user, token: authToken } = await createAuthenticatedUser();
      token = authToken;
      const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
      examId = exam._id.toString();
    });

    it('should require examId', async () => {
      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          page: 1,
          yTop: 0.5,
          content: { type: 'text', data: 'Test' },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('examId');
    });

    it('should require valid page number', async () => {
      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          examId,
          page: 0,
          yTop: 0.5,
          content: { type: 'text', data: 'Test' },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('page');
    });

    it('should require yTop in range [0,1]', async () => {
      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          examId,
          page: 1,
          yTop: 1.5,
          content: { type: 'text', data: 'Test' },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('yTop');
    });

    it('should require content object', async () => {
      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          examId,
          page: 1,
          yTop: 0.5,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('content');
    });

    it('should validate content type', async () => {
      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          examId,
          page: 1,
          yTop: 0.5,
          content: { type: 'invalid', data: 'Test' },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('content.type');
    });

    it('should require non-empty content data', async () => {
      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          examId,
          page: 1,
          yTop: 0.5,
          content: { type: 'text', data: '   ' },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('content.data');
    });
  });

  describe('Creation', () => {
    it('should create answer with valid data', async () => {
      const { user, token } = await createAuthenticatedUser();
      const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

      const answerData = {
        examId: exam._id.toString(),
        page: 1,
        yTop: 0.5,
        content: {
          type: 'text',
          data: 'Test comment',
        },
      };

      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send(answerData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');

      // Vérifier que l'answer a été créée
      const answer = await AnswerModel.findById(response.body.id);
      expect(answer).toBeTruthy();
      expect(answer?.content?.data).toBe('Test comment');
      expect(answer?.authorId?.toString()).toBe(user._id.toString());
    });

    it('should create LaTeX answer with rendered content', async () => {
      const { user, token } = await createAuthenticatedUser();
      const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

      const answerData = {
        examId: exam._id.toString(),
        page: 1,
        yTop: 0.5,
        content: {
          type: 'latex',
          data: '\\int_0^1 x^2 dx',
          rendered: '<span>Rendered LaTeX</span>',
        },
      };

      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send(answerData);

      expect(response.status).toBe(200);

      const answer = await AnswerModel.findById(response.body.id);
      expect(answer?.content?.type).toBe('latex');
      expect(answer?.content?.rendered).toBe('<span>Rendered LaTeX</span>');
    });

    it('should trim content data', async () => {
      const { user, token } = await createAuthenticatedUser();
      const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          examId: exam._id.toString(),
          page: 1,
          yTop: 0.5,
          content: {
            type: 'text',
            data: '  Test with spaces  ',
          },
        });

      const answer = await AnswerModel.findById(response.body.id);
      expect(answer?.content?.data).toBe('Test with spaces');
    });
  });
});

describe('PUT /api/answers/:id', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/answers', answersRouter);
  });

  it('should require authentication', async () => {
    const response = await request(app).put('/api/answers/123').send({});

    expect(response.status).toBe(401);
  });

  it('should allow owner to update their answer', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const answer = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id })
    );

    const updatedContent = {
      type: 'text',
      data: 'Updated comment',
    };

    const response = await request(app)
      .put(`/api/answers/${answer._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: updatedContent });

    expect(response.status).toBe(200);

    const updated = await AnswerModel.findById(answer._id);
    expect(updated?.content?.data).toBe('Updated comment');
  });

  it('should forbid non-owner from updating answer', async () => {
    const { user } = await createAuthenticatedUser({ email: 'owner@etu.unistra.fr' });
    const { token: otherToken } = await createAuthenticatedUser({ email: 'other@etu.unistra.fr' });

    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const answer = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id })
    );

    const response = await request(app)
      .put(`/api/answers/${answer._id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ content: { type: 'text', data: 'Hacked' } });

    expect(response.status).toBe(403);
  });
});

describe('DELETE /api/answers/:id', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/answers', answersRouter);
  });

  it('should require authentication', async () => {
    const response = await request(app).delete('/api/answers/123');

    expect(response.status).toBe(401);
  });

  it('should allow owner to delete their answer', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const answer = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id })
    );

    const response = await request(app)
      .delete(`/api/answers/${answer._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    const deleted = await AnswerModel.findById(answer._id);
    expect(deleted).toBeNull();
  });

  it('should forbid non-owner non-admin from deleting answer', async () => {
    const { user } = await createAuthenticatedUser({ email: 'owner@etu.unistra.fr' });
    const { token: otherToken } = await createAuthenticatedUser({ email: 'other@etu.unistra.fr' });

    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const answer = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id })
    );

    const response = await request(app)
      .delete(`/api/answers/${answer._id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(response.status).toBe(403);

    const stillExists = await AnswerModel.findById(answer._id);
    expect(stillExists).toBeTruthy();
  });

  it('should allow admin to delete any answer', async () => {
    const { user } = await createAuthenticatedUser();
    const { token: adminToken } = await createAuthenticatedUser({
      email: 'admin@etu.unistra.fr',
      role: 'admin',
    });

    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const answer = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id })
    );

    const response = await request(app)
      .delete(`/api/answers/${answer._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    const deleted = await AnswerModel.findById(answer._id);
    expect(deleted).toBeNull();
  });
});