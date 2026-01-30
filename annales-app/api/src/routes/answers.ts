import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { authMiddleware, AuthenticatedRequest, AuthorizationUtils } from '../middleware/auth.js';
import { answerService } from '../services/answer.service.js';
import { ServiceError } from '../services/ServiceError.js';

export const router = Router();

// Limites de longueur par type de contenu
const CONTENT_MAX_LENGTH = {
  text: 50_000,   // 50k caractères pour du texte
  image: 10_000,  // 10k caractères (URLs uniquement, pas de data URIs)
  latex: 10_000,  // 10k caractères pour du LaTeX
} as const;

// Domaines autorisés pour les images (évite les liens vers des sites douteux)
const ALLOWED_IMAGE_HOSTS = [
  'i.imgur.com',
  'imgur.com',
  'i.ibb.co',
  'ibb.co',
  'i.postimg.cc',
  'postimg.cc',
] as const;

/**
 * Vérifie si une URL d'image provient d'un domaine autorisé
 */
function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_IMAGE_HOSTS.some(host =>
      parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

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
  )
  .refine(
    (content) => content.type !== 'image' || isAllowedImageUrl(content.data),
    { message: 'Hébergeur d\'image non autorisé. Utilisez imgur.com, ibb.co ou postimg.cc' }
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
  parentId: objectIdSchema('parentId').optional(),
});

const updateAnswerSchema = z.object({
  content: contentSchema,
});

const getRepliesQuerySchema = z.object({
  cursor: objectIdSchema('cursor').optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(50)).optional(),
});

/**
 * @swagger
 * /answers:
 *   get:
 *     summary: Lister les commentaires racines d'un examen
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'examen
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Numéro de page (optionnel, filtre les résultats)
 *     responses:
 *       200:
 *         description: Liste des commentaires racines triés par page, position Y et date de création
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
 *                     description: Position Y relative (0 = haut, 1 = bas)
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
 *                     description: ID de l'auteur du commentaire
 *                   parentId:
 *                     type: string
 *                     nullable: true
 *                     description: Toujours null pour les commentaires racines
 *                   replyCount:
 *                     type: integer
 *                     description: Nombre de réponses dans le thread
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Paramètres invalides
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */

/**
 * @swagger
 * /answers:
 *   post:
 *     summary: Créer un commentaire ou une réponse sur un examen
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
 *                 description: Position Y relative (0 = haut, 1 = bas)
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
 *                     description: Contenu (texte, URL image depuis imgur/ibb/postimg, ou LaTeX)
 *                   rendered:
 *                     type: string
 *                     description: HTML rendu (pour LaTeX)
 *               parentId:
 *                 type: string
 *                 description: ID du commentaire parent (pour créer une réponse dans un thread)
 *     responses:
 *       200:
 *         description: Commentaire créé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: ID du commentaire créé
 *       400:
 *         description: Paramètres invalides
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Commentaire parent non trouvé
 *       500:
 *         description: Erreur serveur
 */

/**
 * @swagger
 * /answers/{id}/replies:
 *   get:
 *     summary: Lister les réponses d'un commentaire (thread)
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du commentaire parent
 *       - in: query
 *         name: cursor
 *         required: false
 *         schema:
 *           type: string
 *         description: ID du dernier élément chargé (pour pagination par curseur)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Nombre de réponses à retourner
 *     responses:
 *       200:
 *         description: Liste des réponses paginées
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
 *                       parentId:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 hasMore:
 *                   type: boolean
 *                   description: Indique s'il y a plus de réponses à charger
 *       400:
 *         description: Paramètres invalides
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Commentaire non trouvé
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
    const answers = await answerService.findByExam(examId, page);

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

    const { examId, page, yTop, content, parentId } = result.data;
    const { id } = await answerService.create({
      examId,
      page,
      yTop,
      content: content as { type: 'text' | 'image' | 'latex'; data: string; rendered?: string },
      authorId: req.user!.id,
      parentId,
    });

    return res.json({ id });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
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
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error(error);
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
    const isAdmin = AuthorizationUtils.isAdmin(req.user);

    await answerService.delete(id, req.user!.id, isAdmin);

    return res.json({ success: true, message: 'Commentaire supprimé' });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

router.get('/:id/replies', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const queryResult = getRepliesQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({ error: queryResult.error.errors[0].message });
    }

    const { cursor, limit } = queryResult.data;
    const result = await answerService.findReplies(id, cursor, limit || 10);

    return res.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});
