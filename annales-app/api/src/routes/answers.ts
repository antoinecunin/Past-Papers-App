import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, requireAdmin, AuthenticatedRequest, AuthorizationUtils } from '../middleware/auth.js';
import { answerService } from '../services/answer.service.js';
import { voteService } from '../services/vote.service.js';
import { objectIdSchema } from '../utils/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { CONTENT_MAX_LENGTH, isValidImageKey } from '../constants/content.js';

export const router = Router();

const contentTypeSchema = z.enum(['text', 'image', 'latex'], {
  errorMap: () => ({ message: 'content.type must be text, image, or latex' }),
});

const contentSchema = z
  .object(
    {
      type: contentTypeSchema,
      data: z.string({ required_error: 'content.data is required' }),
      rendered: z.string().optional(),
    },
    { required_error: 'content is required' }
  )
  .refine(content => content.data.trim().length > 0, { message: 'content.data is required' })
  .refine(
    content => content.data.length <= CONTENT_MAX_LENGTH[content.type],
    content => ({
      message: `Content too long (max ${CONTENT_MAX_LENGTH[content.type].toLocaleString('en-US')} characters for type ${content.type})`,
    })
  )
  .refine(content => content.type !== 'image' || isValidImageKey(content.data), {
    message: 'Invalid image key. Upload an image via /api/files/image',
  });

const getAnswersQuerySchema = z.object({
  examId: objectIdSchema('examId'),
  page: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1, 'page must be an integer >= 1'))
    .optional(),
});

const createAnswerSchema = z.object({
  examId: objectIdSchema('examId'),
  page: z.number({ required_error: 'page is required' }).int().min(1, 'page must be an integer >= 1'),
  yTop: z
    .number({ required_error: 'yTop is required' })
    .min(0, 'yTop must be >= 0')
    .max(1, 'yTop must be <= 1'),
  content: contentSchema,
  parentId: objectIdSchema('parentId').optional(),
  mentionedUserId: objectIdSchema('mentionedUserId').optional(),
});

const updateAnswerSchema = z.object({
  content: contentSchema,
});

const getRepliesQuerySchema = z.object({
  cursor: objectIdSchema('cursor').optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(50)).optional(),
});

const voteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)], {
    errorMap: () => ({ message: 'value must be 1 or -1' }),
  }),
});

/**
 * @swagger
 * /answers:
 *   get:
 *     summary: List root comments for an exam
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 *         description: Exam ID
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number (optional, filters results)
 *     responses:
 *       200:
 *         description: List of root comments sorted by page, Y position, and creation date
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   examId:
 *                     type: string
 *                   page:
 *                     type: integer
 *                   yTop:
 *                     type: number
 *                     description: Relative Y position (0 = top, 1 = bottom)
 *                   content:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [text, image, latex]
 *                       data:
 *                         type: string
 *                       rendered:
 *                         type: string
 *                   authorId:
 *                     type: string
 *                     description: Comment author ID
 *                   author:
 *                     type: object
 *                     nullable: true
 *                     description: Author information (first and last name)
 *                     properties:
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                   parentId:
 *                     type: string
 *                     nullable: true
 *                     description: Always null for root comments
 *                   replyCount:
 *                     type: integer
 *                     description: Number of replies in the thread
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /answers:
 *   post:
 *     summary: Create a comment or reply on an exam
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [examId, page, yTop, content]
 *             properties:
 *               examId:
 *                 type: string
 *                 description: Exam ID
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 description: Page number
 *               yTop:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 description: Relative Y position (0 = top, 1 = bottom)
 *               content:
 *                 type: object
 *                 required: [type, data]
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [text, image, latex]
 *                     description: Content type
 *                   data:
 *                     type: string
 *                     description: Content (text, image URL from imgur/ibb/postimg, or LaTeX)
 *                   rendered:
 *                     type: string
 *                     description: Rendered HTML (for LaTeX)
 *               parentId:
 *                 type: string
 *                 description: Parent comment ID (to create a reply in a thread)
 *               mentionedUserId:
 *                 type: string
 *                 description: Mentioned user ID (only for replies)
 *     responses:
 *       200:
 *         description: Comment created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: ID of the created comment
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Parent comment not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /answers/{id}/replies:
 *   get:
 *     summary: List replies to a comment (thread)
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Parent comment ID
 *       - in: query
 *         name: cursor
 *         required: false
 *         schema:
 *           type: string
 *         description: ID of the last loaded item (for cursor pagination)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of replies to return
 *     responses:
 *       200:
 *         description: Paginated list of replies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 replies:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       examId:
 *                         type: string
 *                       page:
 *                         type: integer
 *                       yTop:
 *                         type: number
 *                       content:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [text, image, latex]
 *                           data:
 *                             type: string
 *                           rendered:
 *                             type: string
 *                       authorId:
 *                         type: string
 *                       author:
 *                         type: object
 *                         nullable: true
 *                         description: Author information (first and last name)
 *                         properties:
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                       parentId:
 *                         type: string
 *                       mentionedUserId:
 *                         type: string
 *                         nullable: true
 *                       mentionedAuthor:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates if there are more replies to load
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Server error
 */

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = getAnswersQuerySchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { examId, page } = result.data;
    const answers = await answerService.findByExam(examId, page, req.user!.id);

    return res.json(answers);
  })
);

router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user!.canComment) {
      return res.status(403).json({ error: 'Your commenting permission has been revoked' });
    }

    const result = createAnswerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { examId, page, yTop, content, parentId, mentionedUserId } = result.data;
    const { id } = await answerService.create({
      examId,
      page,
      yTop,
      content: content as { type: 'text' | 'image' | 'latex'; data: string; rendered?: string },
      authorId: req.user!.id,
      parentId,
      mentionedUserId,
    });

    return res.json({ id });
  })
);

/**
 * @swagger
 * /answers/{id}/vote:
 *   post:
 *     summary: Vote on a comment (upvote or downvote)
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Comment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value:
 *                 type: integer
 *                 enum: [1, -1]
 *                 description: "1 for upvote, -1 for downvote. Sending the same value cancels the vote."
 *     responses:
 *       200:
 *         description: Vote recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 score:
 *                   type: integer
 *                   description: Total comment score
 *                 userVote:
 *                   type: integer
 *                   nullable: true
 *                   description: "Current user vote (1, -1, or null if cancelled)"
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Server error
 */
router.post(
  '/:id/vote',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;

    const result = voteSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { score, userVote } = await voteService.vote(id, req.user!.id, result.data.value);
    return res.json({ score, userVote });
  })
);

/**
 * @swagger
 * /answers/{id}/best:
 *   put:
 *     summary: Toggle best answer mark (admin only, root comments only)
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Best answer toggled
 *       400:
 *         description: Invalid ID or not a root comment
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not admin
 *       404:
 *         description: Comment not found
 */
router.put(
  '/:id/best',
  authMiddleware,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const result = await answerService.toggleBestAnswer(id);
    return res.json(result);
  })
);

/**
 * @swagger
 * /answers/{id}:
 *   put:
 *     summary: Edit an existing comment (owner only)
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Comment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: object
 *                 properties:
 *                   type: { type: string, enum: [text, image, latex] }
 *                   data: { type: string }
 *                   rendered: { type: string }
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *       400:
 *         description: Invalid ID or invalid content
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (not the owner)
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Server error
 */
router.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;

    const result = updateAnswerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { content } = result.data;
    const doc = await answerService.update(
      id,
      { content: content as { type: 'text' | 'image' | 'latex'; data: string; rendered?: string } },
      req.user!.id
    );

    return res.json({ success: true, answer: doc });
  })
);

/**
 * @swagger
 * /answers/{id}:
 *   delete:
 *     summary: Delete a comment (owner only)
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       400:
 *         description: Invalid ID
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (not the owner)
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const isAdmin = AuthorizationUtils.isAdmin(req.user);

    await answerService.delete(id, req.user!.id, isAdmin);

    return res.json({ success: true, message: 'Comment deleted' });
  })
);

router.get(
  '/:id/replies',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;

    const queryResult = getRepliesQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({ error: queryResult.error.errors[0].message });
    }

    const { cursor, limit } = queryResult.data;
    const result = await answerService.findReplies(id, cursor, limit || 10, req.user!.id);

    return res.json(result);
  })
);
