import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest, AuthorizationUtils } from '../middleware/auth.js';
import { examService } from '../services/exam.service.js';
import { ServiceError } from '../services/ServiceError.js';

export const router = Router();

/**
 * @swagger
 * /exams:
 *   get:
 *     summary: Lister tous les examens disponibles
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des examens triés par date de création (plus récent en premier)
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
 *                     description: Chemin S3 du fichier PDF
 *                   pages:
 *                     type: integer
 *                   uploadedBy:
 *                     type: string
 *                     description: ID de l'utilisateur qui a uploadé
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.get('/', authMiddleware, async (_req: AuthenticatedRequest, res) => {
  try {
    const items = await examService.findAll();
    res.json(items);
  } catch (error) {
    console.error('Erreur lors de la récupération des examens:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * @swagger
 * /exams/{id}:
 *   get:
 *     summary: Récupérer un examen par son ID
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'examen (ObjectId MongoDB)
 *     responses:
 *       200:
 *         description: Examen trouvé
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
 *                   description: Chemin S3 du fichier PDF
 *                 pages:
 *                   type: integer
 *                 uploadedBy:
 *                   type: string
 *                   description: ID de l'utilisateur qui a uploadé
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: ID invalide
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Examen non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const exam = await examService.findById(id);
    res.json(exam);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("Erreur lors de la récupération de l'examen:", error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * @swagger
 * /exams/{id}:
 *   delete:
 *     summary: Supprimer un examen (propriétaire ou admin)
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
    const isAdmin = AuthorizationUtils.isAdmin(req.user);

    await examService.delete(id, req.user!.id, isAdmin);

    res.json({ message: 'Examen supprimé avec succès' });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});
