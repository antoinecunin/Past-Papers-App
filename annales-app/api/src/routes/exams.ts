import { Router } from 'express';
import { Exam } from '../models/Exam.js';
export const router = Router();

/**
 * @openapi
 * /exams:
 *   get: { summary: Liste examens, responses: { 200: { description: OK } } }
 */
router.get('/', async (_req, res) => {
  const items = await Exam.find().sort({ createdAt: -1 }).lean();
  res.json(items);
});