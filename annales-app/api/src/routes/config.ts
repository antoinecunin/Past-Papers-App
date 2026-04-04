import { Router } from 'express';
import { instanceConfigService } from '../services/instance-config.service.js';

const router = Router();

/**
 * @swagger
 * /config/instance:
 *   get:
 *     summary: Get public instance configuration
 *     description: Returns instance-specific configuration including email settings. This endpoint is public and doesn't require authentication.
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Instance configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 instance:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Exam Archive - My University"
 *                     organizationName:
 *                       type: string
 *                       example: "My University"
 *                     contactEmail:
 *                       type: string
 *                       example: "contact@example.com"
 *                 email:
 *                   type: object
 *                   properties:
 *                     allowedDomains:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["@students.example.edu"]
 *       500:
 *         description: Server error while loading configuration
 */
router.get('/instance', (req, res) => {
  try {
    const publicConfig = instanceConfigService.getPublicConfig();
    res.json(publicConfig);
  } catch (error) {
    console.error('Failed to get instance config:', error);
    res.status(500).json({ error: 'Failed to load instance configuration' });
  }
});

export default router;
