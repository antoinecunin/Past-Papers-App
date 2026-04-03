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

/**
 * Tests pour /api/answers
 */
describe('GET /api/answers', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/answers', answersRouter);
    app.use(errorHandler);
  });

  it('should require authentication', async () => {
    const response = await request(app).get('/api/answers?examId=123');

    expect(response.status).toBe(401);
  });

  it('should require examId parameter', async () => {
    const { token } = await createAuthenticatedUser();

    const response = await request(app).get('/api/answers').set('Authorization', `Bearer ${token}`);

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

  it('should return all root answers for an exam', async () => {
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

  it('should return replyCount for root answers', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    const root = await AnswerModel.create(
      createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id })
    );

    // Create 3 replies
    await AnswerModel.create([
      createAnswerData({
        examId: exam._id,
        page: 1,
        yTop: 0.5,
        authorId: user._id,
        parentId: root._id,
      }),
      createAnswerData({
        examId: exam._id,
        page: 1,
        yTop: 0.5,
        authorId: user._id,
        parentId: root._id,
      }),
      createAnswerData({
        examId: exam._id,
        page: 1,
        yTop: 0.5,
        authorId: user._id,
        parentId: root._id,
      }),
    ]);

    const response = await request(app)
      .get(`/api/answers?examId=${exam._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1); // Only root, not replies
    expect(response.body[0].replyCount).toBe(3);
  });

  it('should return author firstName and lastName for root answers', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    await AnswerModel.create(
      createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id })
    );

    const response = await request(app)
      .get(`/api/answers?examId=${exam._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].author).toEqual({
      firstName: 'Test',
      lastName: 'User',
    });
  });

  it('should not include replies in root answers list', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    const root = await AnswerModel.create(
      createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id })
    );

    await AnswerModel.create(
      createAnswerData({
        examId: exam._id,
        page: 1,
        yTop: 0.5,
        authorId: user._id,
        parentId: root._id,
      })
    );

    const response = await request(app)
      .get(`/api/answers?examId=${exam._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]._id).toBe(root._id.toString());
  });
});

describe('POST /api/answers', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/answers', answersRouter);
    app.use(errorHandler);
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

  describe('Replies (threads)', () => {
    it('should create a reply to an existing root comment', async () => {
      const { user, token } = await createAuthenticatedUser();
      const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

      const root = await AnswerModel.create(
        createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id })
      );

      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          examId: exam._id.toString(),
          page: 1,
          yTop: 0.5,
          content: { type: 'text', data: 'Reply to comment' },
          parentId: root._id.toString(),
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');

      const reply = await AnswerModel.findById(response.body.id);
      expect(reply?.parentId?.toString()).toBe(root._id.toString());
    });

    it('should reject reply to a non-existent parent (404)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
      const fakeParentId = new Types.ObjectId();

      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          examId: exam._id.toString(),
          page: 1,
          yTop: 0.5,
          content: { type: 'text', data: 'Reply' },
          parentId: fakeParentId.toString(),
        });

      expect(response.status).toBe(404);
    });

    it('should reject reply to a reply (400, single level only)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

      const root = await AnswerModel.create(
        createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id })
      );

      const reply = await AnswerModel.create(
        createAnswerData({
          examId: exam._id,
          page: 1,
          yTop: 0.5,
          authorId: user._id,
          parentId: root._id,
        })
      );

      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          examId: exam._id.toString(),
          page: 1,
          yTop: 0.5,
          content: { type: 'text', data: 'Nested reply' },
          parentId: reply._id.toString(),
        });

      expect(response.status).toBe(400);
    });

    it('should create a reply with mentionedUserId', async () => {
      const { user, token } = await createAuthenticatedUser();
      const { user: mentionedUser } = await createAuthenticatedUser({
        email: testEmail('mentioned'),
      });
      const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

      const root = await AnswerModel.create(
        createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id })
      );

      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          examId: exam._id.toString(),
          page: 1,
          yTop: 0.5,
          content: { type: 'text', data: 'Reply with mention' },
          parentId: root._id.toString(),
          mentionedUserId: mentionedUser._id.toString(),
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');

      const reply = await AnswerModel.findById(response.body.id);
      expect(reply?.mentionedUserId?.toString()).toBe(mentionedUser._id.toString());
    });

    it('should reject mentionedUserId without parentId (400)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const { user: mentionedUser } = await createAuthenticatedUser({
        email: testEmail('mentioned2'),
      });
      const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          examId: exam._id.toString(),
          page: 1,
          yTop: 0.5,
          content: { type: 'text', data: 'Root with mention' },
          mentionedUserId: mentionedUser._id.toString(),
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid mentionedUserId (400)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

      const root = await AnswerModel.create(
        createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id })
      );

      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          examId: exam._id.toString(),
          page: 1,
          yTop: 0.5,
          content: { type: 'text', data: 'Reply with bad mention' },
          parentId: root._id.toString(),
          mentionedUserId: 'invalid-id',
        });

      expect(response.status).toBe(400);
    });

    it('should reject cross-exam reply (400)', async () => {
      const { user, token } = await createAuthenticatedUser();
      const exam1 = await ExamModel.create(createExamData({ uploadedBy: user._id }));
      const exam2 = await ExamModel.create(
        createExamData({ uploadedBy: user._id, title: 'Another Exam' })
      );

      const root = await AnswerModel.create(
        createAnswerData({ examId: exam1._id, page: 1, yTop: 0.5, authorId: user._id })
      );

      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          examId: exam2._id.toString(),
          page: 1,
          yTop: 0.5,
          content: { type: 'text', data: 'Cross-exam reply' },
          parentId: root._id.toString(),
        });

      expect(response.status).toBe(400);
    });
  });
});

describe('PUT /api/answers/:id', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/answers', answersRouter);
    app.use(errorHandler);
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
    const { user } = await createAuthenticatedUser({ email: testEmail('owner') });
    const { token: otherToken } = await createAuthenticatedUser({ email: testEmail('other') });

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
    app.use(errorHandler);
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
    const { user } = await createAuthenticatedUser({ email: testEmail('owner') });
    const { token: otherToken } = await createAuthenticatedUser({ email: testEmail('other') });

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
      email: testEmail('admin'),
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

  it('should cascade-delete replies when deleting a root comment', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    const root = await AnswerModel.create(
      createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id })
    );

    const reply1 = await AnswerModel.create(
      createAnswerData({
        examId: exam._id,
        page: 1,
        yTop: 0.5,
        authorId: user._id,
        parentId: root._id,
      })
    );
    const reply2 = await AnswerModel.create(
      createAnswerData({
        examId: exam._id,
        page: 1,
        yTop: 0.5,
        authorId: user._id,
        parentId: root._id,
      })
    );

    const response = await request(app)
      .delete(`/api/answers/${root._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    // Root and all replies should be gone
    expect(await AnswerModel.findById(root._id)).toBeNull();
    expect(await AnswerModel.findById(reply1._id)).toBeNull();
    expect(await AnswerModel.findById(reply2._id)).toBeNull();
  });

  it('should not cascade when deleting a reply (parent stays)', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    const root = await AnswerModel.create(
      createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id })
    );

    const reply = await AnswerModel.create(
      createAnswerData({
        examId: exam._id,
        page: 1,
        yTop: 0.5,
        authorId: user._id,
        parentId: root._id,
      })
    );

    const response = await request(app)
      .delete(`/api/answers/${reply._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    // Reply is gone but root stays
    expect(await AnswerModel.findById(reply._id)).toBeNull();
    expect(await AnswerModel.findById(root._id)).toBeTruthy();
  });
});

describe('GET /api/answers/:id/replies', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/answers', answersRouter);
    app.use(errorHandler);
  });

  it('should require authentication', async () => {
    const response = await request(app).get('/api/answers/123/replies');

    expect(response.status).toBe(401);
  });

  it('should return 404 for non-existent parent', async () => {
    const { token } = await createAuthenticatedUser();
    const fakeId = new Types.ObjectId();

    const response = await request(app)
      .get(`/api/answers/${fakeId}/replies`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
  });

  it('should return replies for a root comment', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    const root = await AnswerModel.create(
      createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id })
    );

    await AnswerModel.create([
      createAnswerData({
        examId: exam._id,
        page: 1,
        yTop: 0.5,
        authorId: user._id,
        parentId: root._id,
      }),
      createAnswerData({
        examId: exam._id,
        page: 1,
        yTop: 0.5,
        authorId: user._id,
        parentId: root._id,
      }),
    ]);

    const response = await request(app)
      .get(`/api/answers/${root._id}/replies`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.replies).toHaveLength(2);
    expect(response.body.hasMore).toBe(false);
  });

  it('should return hasMore when there are more replies', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    const root = await AnswerModel.create(
      createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id })
    );

    // Create 3 replies
    for (let i = 0; i < 3; i++) {
      await AnswerModel.create(
        createAnswerData({
          examId: exam._id,
          page: 1,
          yTop: 0.5,
          authorId: user._id,
          parentId: root._id,
        })
      );
    }

    const response = await request(app)
      .get(`/api/answers/${root._id}/replies?limit=2`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.replies).toHaveLength(2);
    expect(response.body.hasMore).toBe(true);
  });

  it('should paginate replies using cursor', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    const root = await AnswerModel.create(
      createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id })
    );

    // Create 5 replies
    for (let i = 0; i < 5; i++) {
      await AnswerModel.create(
        createAnswerData({
          examId: exam._id,
          page: 1,
          yTop: 0.5,
          authorId: user._id,
          parentId: root._id,
        })
      );
    }

    // First page
    const firstPage = await request(app)
      .get(`/api/answers/${root._id}/replies?limit=2`)
      .set('Authorization', `Bearer ${token}`);

    expect(firstPage.body.replies).toHaveLength(2);
    expect(firstPage.body.hasMore).toBe(true);

    // Second page using cursor
    const cursor = firstPage.body.replies[1]._id;
    const secondPage = await request(app)
      .get(`/api/answers/${root._id}/replies?limit=2&cursor=${cursor}`)
      .set('Authorization', `Bearer ${token}`);

    expect(secondPage.body.replies).toHaveLength(2);
    expect(secondPage.body.hasMore).toBe(true);

    // Third page
    const cursor2 = secondPage.body.replies[1]._id;
    const thirdPage = await request(app)
      .get(`/api/answers/${root._id}/replies?limit=2&cursor=${cursor2}`)
      .set('Authorization', `Bearer ${token}`);

    expect(thirdPage.body.replies).toHaveLength(1);
    expect(thirdPage.body.hasMore).toBe(false);

    // Ensure no duplicates across pages
    const allIds = [
      ...firstPage.body.replies.map((r: { _id: string }) => r._id),
      ...secondPage.body.replies.map((r: { _id: string }) => r._id),
      ...thirdPage.body.replies.map((r: { _id: string }) => r._id),
    ];
    expect(new Set(allIds).size).toBe(5);
  });

  it('should return replies sorted by _id (chronological)', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    const root = await AnswerModel.create(
      createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id })
    );

    // Create replies sequentially to ensure _id ordering
    const reply1 = await AnswerModel.create(
      createAnswerData({
        examId: exam._id,
        page: 1,
        yTop: 0.5,
        authorId: user._id,
        parentId: root._id,
      })
    );
    const reply2 = await AnswerModel.create(
      createAnswerData({
        examId: exam._id,
        page: 1,
        yTop: 0.5,
        authorId: user._id,
        parentId: root._id,
      })
    );

    const response = await request(app)
      .get(`/api/answers/${root._id}/replies`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.replies[0]._id).toBe(reply1._id.toString());
    expect(response.body.replies[1]._id).toBe(reply2._id.toString());
  });

  it('should return author firstName and lastName for replies', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    const root = await AnswerModel.create(
      createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id })
    );

    await AnswerModel.create(
      createAnswerData({
        examId: exam._id,
        page: 1,
        yTop: 0.5,
        authorId: user._id,
        parentId: root._id,
      })
    );

    const response = await request(app)
      .get(`/api/answers/${root._id}/replies`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.replies).toHaveLength(1);
    expect(response.body.replies[0].author).toEqual({
      firstName: 'Test',
      lastName: 'User',
    });
  });

  it('should return mentionedAuthor for reply with mention', async () => {
    const { user, token } = await createAuthenticatedUser();
    const { user: mentionedUser } = await createAuthenticatedUser({
      email: testEmail('mentioned-reply'),
      firstName: 'Alice',
      lastName: 'Dupont',
    });
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    const root = await AnswerModel.create(
      createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id })
    );

    await AnswerModel.create({
      ...createAnswerData({
        examId: exam._id,
        page: 1,
        yTop: 0.5,
        authorId: user._id,
        parentId: root._id,
      }),
      mentionedUserId: mentionedUser._id,
    });

    const response = await request(app)
      .get(`/api/answers/${root._id}/replies`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.replies).toHaveLength(1);
    expect(response.body.replies[0].mentionedAuthor).toEqual({
      firstName: 'Alice',
      lastName: 'Dupont',
    });
  });

  it('should return mentionedAuthor as null for reply without mention', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    const root = await AnswerModel.create(
      createAnswerData({ examId: exam._id, page: 1, yTop: 0.5, authorId: user._id })
    );

    await AnswerModel.create(
      createAnswerData({
        examId: exam._id,
        page: 1,
        yTop: 0.5,
        authorId: user._id,
        parentId: root._id,
      })
    );

    const response = await request(app)
      .get(`/api/answers/${root._id}/replies`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.replies).toHaveLength(1);
    expect(response.body.replies[0].mentionedAuthor).toBeNull();
  });
});
