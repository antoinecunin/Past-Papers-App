import { Router } from 'express';
import { instanceConfigService } from '../services/instance-config.service.js';

const router = Router();

/**
 * @swagger
 * /api/config/instance:
 *   get:
 *     summary: Get public instance configuration
 *     description: Returns instance-specific configuration including branding, features, and legal info. This endpoint is public and doesn't require authentication.
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
 *                       example: "Annales - Université de Strasbourg"
 *                     shortName:
 *                       type: string
 *                       example: "Annales"
 *                     description:
 *                       type: string
 *                       example: "Plateforme collaborative de partage d'annales d'examens"
 *                 email:
 *                   type: object
 *                   properties:
 *                     allowedDomains:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["@etu.unistra.fr"]
 *                     verificationRequired:
 *                       type: boolean
 *                       example: true
 *                 branding:
 *                   type: object
 *                   properties:
 *                     colors:
 *                       type: object
 *                       properties:
 *                         primary:
 *                           type: string
 *                           example: "#0EA5E9"
 *                         primaryHover:
 *                           type: string
 *                           example: "#0284C7"
 *                         secondary:
 *                           type: string
 *                           example: "#64748B"
 *                         secondaryDark:
 *                           type: string
 *                           example: "#334155"
 *                         error:
 *                           type: string
 *                           example: "#EF4444"
 *                         errorBg:
 *                           type: string
 *                           example: "#FEE2E2"
 *                         success:
 *                           type: string
 *                           example: "#10B981"
 *                         warning:
 *                           type: string
 *                           example: "#F59E0B"
 *                         border:
 *                           type: string
 *                           example: "#E2E8F0"
 *                     logo:
 *                       type: object
 *                       properties:
 *                         path:
 *                           type: string
 *                           example: "/logo.svg"
 *                         alt:
 *                           type: string
 *                           example: "Logo de la plateforme"
 *                 features:
 *                   type: object
 *                   properties:
 *                     enableRegistration:
 *                       type: boolean
 *                       example: true
 *                     enableFileUpload:
 *                       type: boolean
 *                       example: true
 *                     enableComments:
 *                       type: boolean
 *                       example: true
 *                     enableReports:
 *                       type: boolean
 *                       example: true
 *                     maxFileSize:
 *                       type: number
 *                       example: 52428800
 *                 legal:
 *                   type: object
 *                   properties:
 *                     organizationName:
 *                       type: string
 *                       example: "Université de Strasbourg"
 *                     contactEmail:
 *                       type: string
 *                       example: "contact@example.com"
 *                     dataController:
 *                       type: string
 *                       example: "Université de Strasbourg"
 *                     dpo:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "Délégué à la Protection des Données"
 *                         email:
 *                           type: string
 *                           example: "dpo@unistra.fr"
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
