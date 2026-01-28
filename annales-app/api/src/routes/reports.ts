import { Router } from 'express';
import { z } from 'zod';
import { ReportType, ReportReason, ReportStatus } from '../models/Report.js';
import { Types } from 'mongoose';
import { authMiddleware, AuthenticatedRequest, AuthorizationUtils } from '../middleware/auth.js';
import { REPORT_TYPES, REPORT_REASONS, REPORT_STATUSES } from '../constants/reportMetadata.js';
import { reportService } from '../services/report.service.js';
import { ServiceError } from '../services/ServiceError.js';

export const router = Router();

// Schémas Zod
const reportTypeSchema = z.nativeEnum(ReportType, {
  errorMap: () => ({ message: 'Type de signalement invalide' }),
});

const reportReasonSchema = z.nativeEnum(ReportReason, {
  errorMap: () => ({ message: 'Raison de signalement invalide' }),
});

const objectIdSchema = z.string().refine(
  (val) => Types.ObjectId.isValid(val),
  { message: 'ID cible invalide' }
);

const createReportSchema = z.object({
  type: reportTypeSchema,
  targetId: objectIdSchema,
  reason: reportReasonSchema,
  description: z.string().max(500, 'Description trop longue').optional(),
});

const getReportsQuerySchema = z.object({
  status: z.nativeEnum(ReportStatus).optional(),
  type: z.nativeEnum(ReportType).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional().default('20'),
  offset: z.string().transform(Number).pipe(z.number().int().min(0)).optional().default('0'),
});

const reviewReportSchema = z.object({
  action: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: 'Action invalide (approve ou reject)' }),
  }),
  note: z.string().max(200, 'Note trop longue').optional(),
});

/**
 * @swagger
 * /reports/metadata:
 *   get:
 *     summary: Récupérer les métadonnées des signalements (types, raisons, statuts)
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Métadonnées des signalements
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
 *     summary: Créer un signalement
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
 *                 description: Type de contenu signalé
 *               targetId:
 *                 type: string
 *                 description: ID de l'examen ou commentaire signalé
 *               reason:
 *                 type: string
 *                 enum: [inappropriate_content, spam, wrong_subject, copyright_violation, other]
 *                 description: Raison du signalement
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Description optionnelle du problème
 *     responses:
 *       201:
 *         description: Signalement créé avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       409:
 *         description: Signalement déjà existant
 *       500:
 *         description: Erreur serveur
 */
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
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
      message: 'Signalement créé avec succès',
      reportId,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erreur création signalement:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * @swagger
 * /reports:
 *   get:
 *     summary: Lister les signalements (admin uniquement)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filtrer par statut
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [exam, comment]
 *         description: Filtrer par type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Nombre de résultats par page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Décalage pour la pagination
 *     responses:
 *       200:
 *         description: Liste des signalements
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (!AuthorizationUtils.isAdmin(req.user)) {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    const result = getReportsQuerySchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { status, type, limit, offset } = result.data;
    const reportsResult = await reportService.findAll({ status, type, limit, offset });

    res.json(reportsResult);
  } catch (error) {
    console.error('Erreur récupération signalements:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * @swagger
 * /reports/{id}/review:
 *   put:
 *     summary: Traiter un signalement (admin uniquement)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du signalement
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
 *                 description: Action à effectuer
 *               note:
 *                 type: string
 *                 maxLength: 200
 *                 description: Note de l'administrateur
 *     responses:
 *       200:
 *         description: Signalement traité avec succès
 *       400:
 *         description: Action invalide
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       404:
 *         description: Signalement non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id/review', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (!AuthorizationUtils.isAdmin(req.user)) {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    const { id } = req.params;

    const result = reviewReportSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { action, note } = result.data;
    await reportService.review(id, action, req.user!.id, note);

    const actionText = action === 'approve' ? 'approuvé et contenu supprimé' : 'rejeté';
    res.json({ message: `Signalement ${actionText} avec succès` });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erreur traitement signalement:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});
