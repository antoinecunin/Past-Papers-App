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
    const { examId, page, yTop, yBottom, text, author } = req.body as {
      examId?: string; page?: number; yTop?: number; yBottom?: number; text?: string; author?: string;
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
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text requis' });
    }
    const doc = await AnswerModel.create({
      examId, page, yTop, yBottom, text: text.trim(), author
    });
    return res.json({ id: doc._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
});