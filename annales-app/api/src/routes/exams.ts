import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest, AuthorizationUtils } from '../middleware/auth.js';
import { examService } from '../services/exam.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const router = Router();

/**
 * @swagger
 * /exams:
 *   get:
 *     summary: List all available exams
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of exams sorted by creation date (newest first)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   year:
 *                     type: integer
 *                   module:
 *                     type: string
 *                   fileKey:
 *                     type: string
 *                     description: S3 path to the PDF file
 *                   pages:
 *                     type: integer
 *                   uploadedBy:
 *                     type: string
 *                     description: ID of the user who uploaded
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const items = await examService.findAll();
    res.json(items);
  })
);

/**
 * @swagger
 * /exams/{id}:
 *   get:
 *     summary: Get an exam by ID
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exam ID (MongoDB ObjectId)
 *     responses:
 *       200:
 *         description: Exam found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 year:
 *                   type: integer
 *                 module:
 *                   type: string
 *                 fileKey:
 *                   type: string
 *                   description: S3 path to the PDF file
 *                 pages:
 *                   type: integer
 *                 uploadedBy:
 *                   type: string
 *                   description: ID of the user who uploaded
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid ID
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Exam not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const exam = await examService.findById(id);
    res.json(exam);
  })
);

/**
 * @swagger
 * /exams/{id}:
 *   delete:
 *     summary: Delete an exam (owner or admin)
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exam ID
 *     responses:
 *       200:
 *         description: Exam deleted successfully
 *       400:
 *         description: Invalid ID
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (not the owner)
 *       404:
 *         description: Exam not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const isAdmin = AuthorizationUtils.isAdmin(req.user);

    await examService.delete(id, req.user!.id, isAdmin);

    res.json({ message: 'Exam deleted successfully' });
  })
);
