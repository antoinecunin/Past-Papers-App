import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Exam } from '../models/Exam.js';
import { search as searchIndex } from '../services/search.service.js';
import { objectIdSchema } from '../utils/validation.js';

export const router = Router();

const searchQuerySchema = z.object({
  q: z
    .string({ required_error: 'Query is required' })
    .trim()
    .min(1, 'Query is required')
    .max(200, 'Query is too long'),
  examId: objectIdSchema('examId').optional(),
  limit: z
    .string()
    .optional()
    .transform(v => (v ? Number(v) : 20))
    .pipe(z.number().int().min(1).max(100)),
  offset: z
    .string()
    .optional()
    .transform(v => (v ? Number(v) : 0))
    .pipe(z.number().int().min(0).max(10_000)),
});

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Full-text search across exam pages
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: Search query (1-200 characters)
 *       - in: query
 *         name: examId
 *         schema: { type: string }
 *         description: Restrict the search to a single exam
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0, minimum: 0 }
 *     responses:
 *       200:
 *         description: Search results grouped by page
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       examId: { type: string }
 *                       examTitle: { type: string }
 *                       module: { type: string }
 *                       year: { type: integer }
 *                       pageNumber: { type: integer }
 *                       snippet: { type: string, description: Highlighted snippet with <em> markers }
 *                 total: { type: integer }
 *                 scannedExamsExcluded: { type: integer }
 *       400: { description: Invalid query }
 *       401: { description: Not authenticated }
 *       503: { description: Search engine unavailable }
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const { q, examId, limit, offset } = parsed.data;

    let response;
    try {
      response = await searchIndex(q, { examId, limit, offset });
    } catch (err) {
      console.warn('[search] query failed:', (err as Error).message);
      return res.status(503).json({ error: 'Search engine unavailable' });
    }

    const results = response.hits.map(hit => ({
      examId: hit.examId,
      examTitle: hit.examTitle,
      module: hit.module,
      year: hit.year,
      pageNumber: hit.pageNumber,
      snippet: hit._formatted?.text ?? hit.text,
    }));

    // Expose how many scanned-only exams are intentionally excluded so the
    // UI can tell users "X PDFs are not searchable" instead of looking
    // incomplete. When scoping to a single exam this number is per-design 0 or 1.
    const scanFilter = examId ? { _id: examId, searchable: false } : { searchable: false };
    const scannedExamsExcluded = await Exam.countDocuments(scanFilter);

    res.json({
      results,
      total: response.estimatedTotalHits,
      scannedExamsExcluded,
    });
  })
);
