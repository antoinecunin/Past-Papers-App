import { Router } from 'express';
import { Exam } from '../models/Exam.js';
import { AnswerModel } from '../models/Answer.js';
import { Types } from 'mongoose';
import { authMiddleware, AuthenticatedRequest, AuthorizationUtils } from '../middleware/auth.js';
import { deleteFile } from '../services/s3.js';
export const router = Router();

/**
 * @openapi
 * /exams:
 *   get:
 *     summary: Liste examens
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', authMiddleware, async (_req: AuthenticatedRequest, res) => {
  const items = await Exam.find().sort({ createdAt: -1 }).lean();
  res.json(items);
});

/**
 * @openapi
 * /exams/{id}:
 *   get:
 *     summary: Récupère un examen par son ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Examen trouvé
 *       404:
 *         description: Examen non trouvé
 */
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'ID est un ObjectId valide
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const exam = await Exam.findById(id).lean();

    if (!exam) {
      return res.status(404).json({ error: 'Examen non trouvé' });
    }

    res.json(exam);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'examen:", error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @openapi
 * /exams/{id}:
 *   delete:
 *     summary: Supprime un examen (propriétaire uniquement)
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'examen
 *     responses:
 *       200:
 *         description: Examen supprimé avec succès
 *       400:
 *         description: ID invalide
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé (pas le propriétaire)
 *       404:
 *         description: Examen non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'ID est un ObjectId valide
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    // Rechercher l'examen
    const exam = await Exam.findById(id);

    if (!exam) {
      return res.status(404).json({ error: 'Examen non trouvé' });
    }

    // Vérifier que l'utilisateur peut supprimer (propriétaire ou admin)
    if (!AuthorizationUtils.canDelete(req.user, exam.uploadedBy.toString())) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres examens' });
    }

    // Supprimer le fichier de S3
    try {
      await deleteFile(exam.fileKey);
    } catch (s3Error) {
      console.error('Erreur suppression S3:', s3Error);
      // On continue même si la suppression S3 échoue
    }

    // Supprimer tous les commentaires associés à cet examen
    try {
      const deletedAnswers = await AnswerModel.deleteMany({ examId: new Types.ObjectId(id) });
      console.log(`Suppression de ${deletedAnswers.deletedCount} commentaires pour l'examen ${id}`);
    } catch (answerError) {
      console.error('Erreur suppression commentaires:', answerError);
      // On continue même si la suppression des commentaires échoue
    }

    // Supprimer l'examen de la base de données
    await Exam.findByIdAndDelete(id);

    res.json({ message: 'Examen supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
