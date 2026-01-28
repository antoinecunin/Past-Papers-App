import { Router } from 'express';
export const router = Router();
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Vérifier l'état de l'API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service en fonctionnement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 */
router.get('/', (_req, res) => res.json({ ok: true }));
