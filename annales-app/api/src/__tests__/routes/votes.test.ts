import request from 'supertest';
import express from 'express';
import { Types } from 'mongoose';
import { router as answersRouter } from '../../routes/answers.js';
import { Exam as ExamModel } from '../../models/Exam.js';
import { AnswerModel } from '../../models/Answer.js';
import { VoteModel } from '../../models/Vote.js';
import { createAuthenticatedUser, testEmail } from '../helpers/auth.helper.js';
import { createExamData } from '../fixtures/exam.fixture.js';
import { createAnswerData } from '../fixtures/answer.fixture.js';
import { errorHandler } from '../../middleware/errorHandler.js';

/**
 * Tests pour POST /api/answers/:id/vote
 */
describe('POST /api/answers/:id/vote', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/answers', answersRouter);
    app.use(errorHandler);
  });

  it('should require authentication', async () => {
    const id = new Types.ObjectId();
    const response = await request(app).post(`/api/answers/${id}/vote`).send({ value: 1 });

    expect(response.status).toBe(401);
  });

  it('should reject invalid answer ID', async () => {
    const { token } = await createAuthenticatedUser();

    const response = await request(app)
      .post('/api/answers/invalid/vote')
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 1 });

    expect(response.status).toBe(400);
  });

  it('should reject value other than 1 or -1', async () => {
    const { token } = await createAuthenticatedUser();
    const id = new Types.ObjectId();

    const response = await request(app)
      .post(`/api/answers/${id}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 2 });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('1 or -1');
  });

  it('should reject missing value', async () => {
    const { token } = await createAuthenticatedUser();
    const id = new Types.ObjectId();

    const response = await request(app)
      .post(`/api/answers/${id}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it('should return 404 for non-existent answer', async () => {
    const { token } = await createAuthenticatedUser();
    const id = new Types.ObjectId();

    const response = await request(app)
      .post(`/api/answers/${id}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 1 });

    expect(response.status).toBe(404);
  });

  it('should create an upvote', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const answer = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id })
    );

    const response = await request(app)
      .post(`/api/answers/${answer._id}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 1 });

    expect(response.status).toBe(200);
    expect(response.body.score).toBe(1);
    expect(response.body.userVote).toBe(1);

    // Verify vote in database
    const vote = await VoteModel.findOne({ answerId: answer._id, userId: user._id });
    expect(vote).not.toBeNull();
    expect(vote!.value).toBe(1);
  });

  it('should create a downvote', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const answer = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id })
    );

    const response = await request(app)
      .post(`/api/answers/${answer._id}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: -1 });

    expect(response.status).toBe(200);
    expect(response.body.score).toBe(-1);
    expect(response.body.userVote).toBe(-1);
  });

  it('should cancel vote when same value is sent again (toggle)', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const answer = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id })
    );

    // First vote
    await request(app)
      .post(`/api/answers/${answer._id}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 1 });

    // Same vote again → cancel
    const response = await request(app)
      .post(`/api/answers/${answer._id}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 1 });

    expect(response.status).toBe(200);
    expect(response.body.score).toBe(0);
    expect(response.body.userVote).toBeNull();

    // Vote should be removed from database
    const vote = await VoteModel.findOne({ answerId: answer._id, userId: user._id });
    expect(vote).toBeNull();
  });

  it('should change vote from upvote to downvote', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const answer = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id })
    );

    // Upvote
    await request(app)
      .post(`/api/answers/${answer._id}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 1 });

    // Change to downvote
    const response = await request(app)
      .post(`/api/answers/${answer._id}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: -1 });

    expect(response.status).toBe(200);
    expect(response.body.score).toBe(-1);
    expect(response.body.userVote).toBe(-1);
  });

  it('should change vote from downvote to upvote', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const answer = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id })
    );

    // Downvote
    await request(app)
      .post(`/api/answers/${answer._id}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: -1 });

    // Change to upvote
    const response = await request(app)
      .post(`/api/answers/${answer._id}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 1 });

    expect(response.status).toBe(200);
    expect(response.body.score).toBe(1);
    expect(response.body.userVote).toBe(1);
  });

  it('should handle votes from multiple users independently', async () => {
    const { user: user1, token: token1 } = await createAuthenticatedUser({
      email: testEmail('voter1'),
    });
    const { token: token2 } = await createAuthenticatedUser({
      email: testEmail('voter2'),
    });
    const exam = await ExamModel.create(createExamData({ uploadedBy: user1._id }));
    const answer = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user1._id })
    );

    // User 1 upvotes
    await request(app)
      .post(`/api/answers/${answer._id}/vote`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ value: 1 });

    // User 2 downvotes
    const response = await request(app)
      .post(`/api/answers/${answer._id}/vote`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ value: -1 });

    expect(response.status).toBe(200);
    expect(response.body.score).toBe(0); // 1 + (-1) = 0
    expect(response.body.userVote).toBe(-1); // User 2's vote
  });
});

/**
 * Tests pour score et userVote dans GET /api/answers
 */
describe('GET /api/answers - score and userVote', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/answers', answersRouter);
    app.use(errorHandler);
  });

  it('should return score and userVote fields on root answers', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const answer = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id })
    );

    // Vote on it
    await request(app)
      .post(`/api/answers/${answer._id}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 1 });

    // Fetch answers
    const response = await request(app)
      .get(`/api/answers?examId=${exam._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body[0].score).toBe(1);
    expect(response.body[0].userVote).toBe(1);
  });

  it('should return userVote as null when user has not voted', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    await AnswerModel.create(createAnswerData({ examId: exam._id, authorId: user._id }));

    const response = await request(app)
      .get(`/api/answers?examId=${exam._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body[0].score).toBe(0);
    expect(response.body[0].userVote).toBeNull();
  });
});

/**
 * Tests pour score et userVote dans GET /api/answers/:id/replies
 */
describe('GET /api/answers/:id/replies - score and userVote', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/answers', answersRouter);
    app.use(errorHandler);
  });

  it('should return score and userVote fields on replies', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const rootAnswer = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id })
    );
    const reply = await AnswerModel.create(
      createAnswerData({
        examId: exam._id,
        authorId: user._id,
        parentId: rootAnswer._id,
      })
    );

    // Vote on the reply
    await request(app)
      .post(`/api/answers/${reply._id}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: -1 });

    // Fetch replies
    const response = await request(app)
      .get(`/api/answers/${rootAnswer._id}/replies`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.replies[0].score).toBe(-1);
    expect(response.body.replies[0].userVote).toBe(-1);
  });
});

/**
 * Tests pour la cascade delete des votes
 */
describe('Vote cascade delete', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/answers', answersRouter);
    app.use(errorHandler);
  });

  it('should delete votes when answer is deleted', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const answer = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id })
    );

    // Vote
    await request(app)
      .post(`/api/answers/${answer._id}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 1 });

    expect(await VoteModel.countDocuments({ answerId: answer._id })).toBe(1);

    // Delete answer
    await request(app).delete(`/api/answers/${answer._id}`).set('Authorization', `Bearer ${token}`);

    // Votes should be gone
    expect(await VoteModel.countDocuments({ answerId: answer._id })).toBe(0);
  });

  it('should delete votes on replies when root answer is deleted', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));
    const root = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id })
    );
    const reply = await AnswerModel.create(
      createAnswerData({ examId: exam._id, authorId: user._id, parentId: root._id })
    );

    // Vote on root and reply
    await request(app)
      .post(`/api/answers/${root._id}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 1 });
    await request(app)
      .post(`/api/answers/${reply._id}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: -1 });

    expect(await VoteModel.countDocuments()).toBe(2);

    // Delete root → cascades to reply votes
    await request(app).delete(`/api/answers/${root._id}`).set('Authorization', `Bearer ${token}`);

    expect(await VoteModel.countDocuments()).toBe(0);
  });
});
