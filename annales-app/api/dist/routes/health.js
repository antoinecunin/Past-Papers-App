import { Router } from 'express';
export const router = Router();
/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', (_req, res) => res.json({ ok: true }));
