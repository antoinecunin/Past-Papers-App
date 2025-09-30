import { Router } from 'express';
import { AnswerModel } from '../models/Answer.js';
import { Types } from 'mongoose';
import { authMiddleware, AuthorizationUtils } from '../middleware/auth.js';
export const router = Router();
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
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { examId, page } = req.query;
        if (!examId || !Types.ObjectId.isValid(examId)) {
            return res.status(400).json({ error: 'examId (ObjectId) requis' });
        }
        const filter = { examId };
        if (page) {
            const p = Number(page);
            if (!Number.isInteger(p) || p < 1) {
                return res.status(400).json({ error: 'page doit être un entier >= 1' });
            }
            filter.page = p;
        }
        const answers = await AnswerModel.find(filter).sort({ page: 1, yTop: 1, createdAt: 1 }).lean();
        return res.json(answers);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal error' });
    }
});
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { examId, page, yTop, content } = req.body;
        if (!examId || !Types.ObjectId.isValid(examId)) {
            return res.status(400).json({ error: 'examId (ObjectId) requis' });
        }
        if (!Number.isInteger(page) || page < 1) {
            return res.status(400).json({ error: 'page doit être un entier >= 1' });
        }
        if (typeof yTop !== 'number' || yTop < 0 || yTop > 1) {
            return res.status(400).json({ error: 'yTop doit être un nombre dans [0,1]' });
        }
        // Vérifier qu'on a content
        if (!content || !content.type || !content.data) {
            return res.status(400).json({ error: 'content requis' });
        }
        // Validation du content
        const validTypes = ['text', 'image', 'latex'];
        if (!validTypes.includes(content.type)) {
            return res.status(400).json({ error: 'content.type doit être text, image ou latex' });
        }
        if (!content.data.trim()) {
            return res.status(400).json({ error: 'content.data requis' });
        }
        const docData = {
            examId,
            page: page,
            yTop: yTop,
            authorId: req.user.id,
            content: {
                type: content.type,
                data: content.data.trim(),
                ...(content.rendered && { rendered: content.rendered }),
            },
        };
        const doc = await AnswerModel.create(docData);
        return res.json({ id: doc._id });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal error' });
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
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID invalide' });
        }
        // Vérifier qu'on a content
        if (!content || !content.type || !content.data) {
            return res.status(400).json({ error: 'content requis' });
        }
        // Validation du content
        const validTypes = ['text', 'image', 'latex'];
        if (!validTypes.includes(content.type)) {
            return res.status(400).json({ error: 'content.type doit être text, image ou latex' });
        }
        if (!content.data.trim()) {
            return res.status(400).json({ error: 'content.data requis' });
        }
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
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal error' });
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
router.delete('/:id', authMiddleware, async (req, res) => {
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
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal error' });
    }
});
