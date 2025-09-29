import { Router } from 'express';
import { ReportModel, ReportType, ReportReason, ReportStatus } from '../models/Report.js';
import { Exam } from '../models/Exam.js';
import { AnswerModel } from '../models/Answer.js';
import { Types } from 'mongoose';
import { authMiddleware, AuthenticatedRequest, AuthorizationUtils } from '../middleware/auth.js';
import { deleteFile } from '../services/s3.js';

export const router = Router();

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
    const { type, targetId, reason, description } = req.body as {
      type?: string;
      targetId?: string;
      reason?: string;
      description?: string;
    };

    // Validation des données
    if (!type || !Object.values(ReportType).includes(type as ReportType)) {
      return res.status(400).json({ error: 'Type de signalement invalide' });
    }

    if (!targetId || !Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ error: 'ID cible invalide' });
    }

    if (!reason || !Object.values(ReportReason).includes(reason as ReportReason)) {
      return res.status(400).json({ error: 'Raison de signalement invalide' });
    }

    // Vérifier que la cible existe
    if (type === ReportType.EXAM) {
      const exam = await Exam.findById(targetId);
      if (!exam) {
        return res.status(404).json({ error: 'Examen non trouvé' });
      }
    } else if (type === ReportType.COMMENT) {
      const comment = await AnswerModel.findById(targetId);
      if (!comment) {
        return res.status(404).json({ error: 'Commentaire non trouvé' });
      }
    }

    // Créer le signalement
    const report = await ReportModel.create({
      type: type as ReportType,
      targetId: new Types.ObjectId(targetId),
      reason: reason as ReportReason,
      description: description?.trim() || undefined,
      reportedBy: new Types.ObjectId(req.user!.id),
    });

    res.status(201).json({
      message: 'Signalement créé avec succès',
      reportId: report._id,
    });
  } catch (error) {
    console.error('Erreur création signalement:', error);

    // Gestion de l'erreur de doublon
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return res.status(409).json({ error: 'Vous avez déjà signalé ce contenu' });
    }

    res.status(500).json({ error: 'Erreur serveur' });
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

    const { status, type, limit = 20, offset = 0 } = req.query as {
      status?: string;
      type?: string;
      limit?: string;
      offset?: string;
    };

    // Construire le filtre
    const filter: Record<string, unknown> = {};
    if (status && Object.values(ReportStatus).includes(status as ReportStatus)) {
      filter.status = status;
    }
    if (type && Object.values(ReportType).includes(type as ReportType)) {
      filter.type = type;
    }

    // Valider la pagination
    const limitNum = Math.min(Math.max(parseInt(String(limit || 20)) || 20, 1), 100);
    const offsetNum = Math.max(parseInt(String(offset || 0)) || 0, 0);

    // Récupérer les signalements avec les détails des utilisateurs
    const reports = await ReportModel.find(filter)
      .populate('reportedBy', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(offsetNum)
      .lean();

    // Compter le total pour la pagination
    const total = await ReportModel.countDocuments(filter);

    res.json({
      reports,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total,
      },
    });
  } catch (error) {
    console.error('Erreur récupération signalements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
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
    const { action, note } = req.body as {
      action?: string;
      note?: string;
    };

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action invalide (approve ou reject)' });
    }

    // Récupérer le signalement
    const report = await ReportModel.findById(id);
    if (!report) {
      return res.status(404).json({ error: 'Signalement non trouvé' });
    }

    if (report.status !== ReportStatus.PENDING) {
      return res.status(400).json({ error: 'Ce signalement a déjà été traité' });
    }

    // Si approuvé, supprimer le contenu signalé
    if (action === 'approve') {
      if (report.type === ReportType.EXAM) {
        const exam = await Exam.findById(report.targetId);
        if (exam) {
          // Supprimer le fichier S3
          try {
            await deleteFile(exam.fileKey);
          } catch (s3Error) {
            console.error('Erreur suppression S3:', s3Error);
          }

          // Supprimer les commentaires associés
          await AnswerModel.deleteMany({ examId: exam._id });

          // Supprimer l'examen
          await Exam.findByIdAndDelete(exam._id);
        }
      } else if (report.type === ReportType.COMMENT) {
        await AnswerModel.findByIdAndDelete(report.targetId);
      }
    }

    // Mettre à jour le signalement
    await ReportModel.findByIdAndUpdate(id, {
      status: action === 'approve' ? ReportStatus.APPROVED : ReportStatus.REJECTED,
      reviewedBy: new Types.ObjectId(req.user!.id),
      reviewedAt: new Date(),
      reviewNote: note?.trim() || undefined,
    });

    const actionText = action === 'approve' ? 'approuvé et contenu supprimé' : 'rejeté';
    res.json({ message: `Signalement ${actionText} avec succès` });
  } catch (error) {
    console.error('Erreur traitement signalement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});