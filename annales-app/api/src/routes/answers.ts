import { Router } from 'express';
import { z } from 'zod';
import { AnswerModel } from '../models/Answer.js';
import { Types } from 'mongoose';
import { authMiddleware, AuthenticatedRequest, AuthorizationUtils } from '../middleware/auth.js';

export const router = Router();

// Limites de longueur par type de contenu
const CONTENT_MAX_LENGTH = {
  text: 50_000,   // 50k caractères pour du texte
  image: 10_000,  // 10k caractères (URLs uniquement, pas de data URIs)
  latex: 10_000,  // 10k caractères pour du LaTeX
} as const;

// Schémas Zod
const contentTypeSchema = z.enum(['text', 'image', 'latex'], {
  errorMap: () => ({ message: 'content.type doit être text, image ou latex' }),
});

const contentSchema = z.object({
  type: contentTypeSchema,
  data: z.string({ required_error: 'content.data requis' }),
  rendered: z.string().optional(),
}, { required_error: 'content requis' })
  .refine(
    (content) => content.data.trim().length > 0,
    { message: 'content.data requis' }
  )
  .refine(
    (content) => content.data.length <= CONTENT_MAX_LENGTH[content.type],
    (content) => ({
      message: `Contenu trop long (max ${CONTENT_MAX_LENGTH[content.type].toLocaleString('fr-FR')} caractères pour le type ${content.type})`,
    })
  );

const objectIdSchema = (field: string) => z.string({
  required_error: `${field} (ObjectId) requis`,
}).refine(
  (val) => Types.ObjectId.isValid(val),
  { message: `${field} (ObjectId) invalide` }
);

const getAnswersQuerySchema = z.object({
  examId: objectIdSchema('examId'),
  page: z.string().transform(Number).pipe(z.number().int().min(1, 'page doit être un entier >= 1')).optional(),
});

const createAnswerSchema = z.object({
  examId: objectIdSchema('examId'),
  page: z.number({ required_error: 'page requis' }).int().min(1, 'page doit être un entier >= 1'),
  yTop: z.number({ required_error: 'yTop requis' }).min(0, 'yTop doit être >= 0').max(1, 'yTop doit être <= 1'),
  content: contentSchema,
});

const updateAnswerSchema = z.object({
  content: contentSchema,
});

/**
 * @swagger
 * /answers:
 *   get:
 *     summary: Lister les réponses d'un examen (optionnellement filtrées par page)
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: examId
 *         required: true
 *         schema: { type: string }
 *         description: ID de l'examen
 *       - in: query
 *         name: page
 *         required: false
 *         schema: { type: integer, minimum: 1 }
 *         description: Numéro de page (optionnel)
 *     responses:
 *       200:
 *         description: Liste des commentaires
 *       400:
 *         description: Paramètres invalides
 *       500:
 *         description: Erreur serveur
 *   post:
 *     summary: Créer un commentaire ancré sur (page, yTop)
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
 *                 description: ID de l'examen
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 description: Numéro de page
 *               yTop:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 description: Position Y relative (0-1)
 *               content:
 *                 type: object
 *                 required: [type, data]
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [text, image, latex]
 *                     description: Type de contenu
 *                   data:
 *                     type: string
 *                     description: Contenu du commentaire
 *                   rendered:
 *                     type: string
 *                     description: Version rendue (optionnel)
 *     responses:
 *       200:
 *         description: Commentaire créé avec succès
 *       400:
 *         description: Paramètres invalides
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const result = getAnswersQuerySchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { examId, page } = result.data;
    const filter: { examId: string; page?: number } = { examId };
    if (page) {
      filter.page = page;
    }
    const answers = await AnswerModel.find(filter).sort({ page: 1, yTop: 1, createdAt: 1 }).lean();
    return res.json(answers);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const result = createAnswerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { examId, page, yTop, content } = result.data;

    const docData = {
      examId,
      page,
      yTop,
      authorId: req.user!.id,
      content: {
        type: content.type,
        data: content.data.trim(),
        ...(content.rendered && { rendered: content.rendered }),
      },
    };

    const doc = await AnswerModel.create(docData);
    return res.json({ id: doc._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * @swagger
 * /answers/{id}:
 *   put:
 *     summary: Modifier un commentaire existant (propriétaire uniquement)
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID du commentaire
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
 *         description: Commentaire modifié avec succès
 *       400:
 *         description: ID invalide ou contenu invalide
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé (pas le propriétaire)
 *       404:
 *         description: Commentaire non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const result = updateAnswerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { content } = result.data;

    // Trouver le commentaire et vérifier la propriété
    const existingAnswer = await AnswerModel.findById(id);

    if (!existingAnswer) {
      return res.status(404).json({ error: 'Commentaire non trouvé' });
    }

    // Vérifier que l'utilisateur peut modifier (propriétaire uniquement)
    if (!AuthorizationUtils.canEdit(req.user, existingAnswer.authorId?.toString() || '')) {
      return res
        .status(403)
        .json({ error: 'Vous ne pouvez modifier que vos propres commentaires' });
    }

    const updateData = {
      content: {
        type: content.type,
        data: content.data.trim(),
        ...(content.rendered && { rendered: content.rendered }),
      },
    };

    const doc = await AnswerModel.findByIdAndUpdate(id, updateData, { new: true });

    return res.json({ success: true, answer: doc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * @swagger
 * /answers/{id}:
 *   delete:
 *     summary: Supprimer un commentaire (propriétaire uniquement)
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID du commentaire
 *     responses:
 *       200:
 *         description: Commentaire supprimé avec succès
 *       400:
 *         description: ID invalide
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé (pas le propriétaire)
 *       404:
 *         description: Commentaire non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    // Trouver le commentaire et vérifier la propriété
    const existingAnswer = await AnswerModel.findById(id);

    if (!existingAnswer) {
      return res.status(404).json({ error: 'Commentaire non trouvé' });
    }

    // Vérifier que l'utilisateur peut supprimer (propriétaire ou admin)
    if (!AuthorizationUtils.canDelete(req.user, existingAnswer.authorId?.toString() || '')) {
      return res
        .status(403)
        .json({ error: 'Vous ne pouvez supprimer que vos propres commentaires' });
    }

    await AnswerModel.findByIdAndDelete(id);

    return res.json({ success: true, message: 'Commentaire supprimé' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});
