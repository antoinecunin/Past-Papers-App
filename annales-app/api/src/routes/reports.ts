import { Router } from 'express';
import { z } from 'zod';
import { ReportType, ReportReason, ReportStatus } from '../models/Report.js';
import { authMiddleware, AuthenticatedRequest, AuthorizationUtils } from '../middleware/auth.js';
import { REPORT_TYPES, REPORT_REASONS, REPORT_STATUSES } from '../constants/reportMetadata.js';
import { reportService } from '../services/report.service.js';
import { objectIdSchema } from '../utils/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const router = Router();

const reportTypeSchema = z.nativeEnum(ReportType, {
  errorMap: () => ({ message: 'Invalid report type' }),
});

const reportReasonSchema = z.nativeEnum(ReportReason, {
  errorMap: () => ({ message: 'Invalid report reason' }),
});

const createReportSchema = z.object({
  type: reportTypeSchema,
  targetId: objectIdSchema('targetId'),
  reason: reportReasonSchema,
  description: z.string().max(500, 'Description too long').optional(),
});

const getReportsQuerySchema = z.object({
  status: z.nativeEnum(ReportStatus).optional(),
  type: z.nativeEnum(ReportType).optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .default('20'),
  offset: z.string().transform(Number).pipe(z.number().int().min(0)).optional().default('0'),
});

const reviewReportSchema = z.object({
  action: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: 'Invalid action (approve or reject)' }),
  }),
  note: z.string().max(200, 'Note too long').optional(),
});

/**
 * @swagger
 * /reports/metadata:
 *   get:
 *     summary: Get report metadata (types, reasons, statuses)
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Report metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 types:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: string
 *                       label:
 *                         type: string
 *                       description:
 *                         type: string
 *                 reasons:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: string
 *                       label:
 *                         type: string
 *                       description:
 *                         type: string
 *                 statuses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: string
 *                       label:
 *                         type: string
 *                       description:
 *                         type: string
 */
router.get('/metadata', (req, res) => {
  res.json({
    types: REPORT_TYPES,
    reasons: REPORT_REASONS,
    statuses: REPORT_STATUSES,
  });
});

/**
 * @swagger
 * /reports:
 *   post:
 *     summary: Create a report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, targetId, reason]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [exam, comment]
 *                 description: Type of reported content
 *               targetId:
 *                 type: string
 *                 description: ID of the reported exam or comment
 *               reason:
 *                 type: string
 *                 enum: [inappropriate_content, spam, off_topic, wrong_exam, poor_quality, duplicate, other]
 *                 description: "Report reason (comments - inappropriate_content, spam, off_topic / exams - wrong_exam, poor_quality, duplicate)"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional description of the issue
 *     responses:
 *       201:
 *         description: Report created successfully
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Not authenticated
 *       409:
 *         description: Report already exists
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = createReportSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { type, targetId, reason, description } = result.data;
    const { reportId } = await reportService.create({
      type,
      targetId,
      reason,
      description,
      reportedBy: req.user!.id,
    });

    res.status(201).json({
      id: reportId,
      message: 'Report created successfully',
    });
  })
);

/**
 * @swagger
 * /reports:
 *   get:
 *     summary: List reports (admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [exam, comment]
 *         description: Filter by type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of reports
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!AuthorizationUtils.isAdmin(req.user)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = getReportsQuerySchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { status, type, limit, offset } = result.data;
    const reportsResult = await reportService.findAll({ status, type, limit, offset });

    res.json(reportsResult);
  })
);

/**
 * @swagger
 * /reports/{id}/review:
 *   put:
 *     summary: Review a report (admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *                 description: Action to perform
 *               note:
 *                 type: string
 *                 maxLength: 200
 *                 description: Administrator note
 *     responses:
 *       200:
 *         description: Report reviewed successfully
 *       400:
 *         description: Invalid action
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Report not found
 *       500:
 *         description: Server error
 */
router.put(
  '/:id/review',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!AuthorizationUtils.isAdmin(req.user)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    const result = reviewReportSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { action, note } = result.data;
    await reportService.review(id, action, req.user!.id, note);

    const actionText = action === 'approve' ? 'approved and content deleted' : 'rejected';
    res.json({ message: `Report ${actionText} successfully` });
  })
);
