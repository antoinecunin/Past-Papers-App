import { Router } from 'express';
import { AnswerModel } from '../models/Answer.js';
import { Types } from 'mongoose';

export const router = Router();

/**
 * @swagger
 * /answers:
 *   get:
 *     summary: Lister les réponses d’un examen (optionnellement filtrées par page)
 *     parameters:
 *       - in: query
 *         name: examId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         required: false
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     summary: Créer un commentaire ancré sur (page, yTop[, yBottom])
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [examId, page, yTop, text]
 *             properties:
 *               examId: { type: string }
 *               page: { type: integer, minimum: 1 }
 *               yTop: { type: number, minimum: 0, maximum: 1 }
 *               yBottom: { type: number, minimum: 0, maximum: 1 }
 *               text: { type: string }
 *               author: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */

router.get('/', async (req, res) => {
  try {
    const { examId, page } = req.query as { examId?: string; page?: string };
    if (!examId || !Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ error: 'examId (ObjectId) requis' });
    }
    const filter: any = { examId };
    if (page) {
      const p = Number(page);
      if (!Number.isInteger(p) || p < 1) {
        return res.status(400).json({ error: 'page doit être un entier >= 1' });
      }
      filter.page = p;
    }
    const answers = await AnswerModel.find(filter).sort({ page: 1, yTop: 1, createdAt: 1 }).lean();
    return res.json(answers);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { examId, page, yTop, yBottom, content, text, author } = req.body as {
      examId?: string;
      page?: number;
      yTop?: number;
      yBottom?: number;
      content?: { type: string; data: string; rendered?: string };
      text?: string;
      author?: string;
    };

    if (!examId || !Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ error: 'examId (ObjectId) requis' });
    }
    if (!Number.isInteger(page) || (page as number) < 1) {
      return res.status(400).json({ error: 'page doit être un entier >= 1' });
    }
    if (typeof yTop !== 'number' || yTop < 0 || yTop > 1) {
      return res.status(400).json({ error: 'yTop doit être un nombre dans [0,1]' });
    }

    // Vérifier qu'on a soit content soit text
    const hasContent = content && content.type && content.data;
    const hasText = typeof text === 'string' && text.trim();

    if (!hasContent && !hasText) {
      return res.status(400).json({ error: 'content ou text requis' });
    }

    // Validation du content si présent
    if (hasContent) {
      const validTypes = ['text', 'image', 'latex'];
      if (!validTypes.includes(content.type)) {
        return res.status(400).json({ error: 'content.type doit être text, image ou latex' });
      }
      if (!content.data.trim()) {
        return res.status(400).json({ error: 'content.data requis' });
      }
    }

    const docData: any = { examId, page, yTop, yBottom, author };

    // Nouveau format prioritaire
    if (hasContent) {
      docData.content = {
        type: content.type,
        data: content.data.trim(),
        ...(content.rendered && { rendered: content.rendered })
      };
    } else {
      // Fallback ancien format
      docData.text = text!.trim();
    }

    const doc = await AnswerModel.create(docData);
    return res.json({ id: doc._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * @swagger
 * /answers/{id}:
 *   put:
 *     summary: Modifier un commentaire existant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
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
 *               text: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, text } = req.body as {
      content?: { type: string; data: string; rendered?: string };
      text?: string;
    };

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    // Vérifier qu'on a soit content soit text
    const hasContent = content && content.type && content.data;
    const hasText = typeof text === 'string' && text.trim();

    if (!hasContent && !hasText) {
      return res.status(400).json({ error: 'content ou text requis' });
    }

    // Validation du content si présent
    if (hasContent) {
      const validTypes = ['text', 'image', 'latex'];
      if (!validTypes.includes(content.type)) {
        return res.status(400).json({ error: 'content.type doit être text, image ou latex' });
      }
      if (!content.data.trim()) {
        return res.status(400).json({ error: 'content.data requis' });
      }
    }

    const updateData: any = {};

    // Nouveau format prioritaire
    if (hasContent) {
      updateData.content = {
        type: content.type,
        data: content.data.trim(),
        ...(content.rendered && { rendered: content.rendered })
      };
      // Supprimer l'ancien text si on utilise le nouveau format
      updateData.$unset = { text: 1 };
    } else {
      // Fallback ancien format
      updateData.text = text!.trim();
      updateData.$unset = { content: 1 };
    }

    const doc = await AnswerModel.findByIdAndUpdate(id, updateData, { new: true });

    if (!doc) {
      return res.status(404).json({ error: 'Commentaire non trouvé' });
    }

    return res.json({ success: true, answer: doc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
});