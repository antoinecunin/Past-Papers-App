import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { uploadBuffer, objectKey, downloadFile } from '../services/s3.js';
import { Exam } from '../models/Exam.js';
import { PDFDocument } from 'pdf-lib';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { objectIdSchema } from '../utils/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Schémas Zod
const currentYear = new Date().getFullYear();

const uploadSchema = z.object({
  title: z
    .string({ required_error: 'Le titre est obligatoire' })
    .min(1, 'Le titre est obligatoire'),
  year: z
    .string()
    .transform(Number)
    .pipe(
      z
        .number()
        .int()
        .min(1900, 'Année invalide')
        .max(currentYear + 1, 'Année invalide')
    ),
  module: z
    .string({ required_error: 'Le module est obligatoire' })
    .min(1, 'Le module est obligatoire'),
});

const examIdParamSchema = z.object({
  examId: objectIdSchema('examId'),
});

/**
 * @swagger
 * /files/upload:
 *   post:
 *     summary: Uploader un PDF d'annales
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, title, year, module]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fichier PDF à télécharger (max 50MB)
 *               title:
 *                 type: string
 *                 description: Titre de l'examen
 *               year:
 *                 type: integer
 *                 description: Année de l'examen (requis)
 *               module:
 *                 type: string
 *                 description: Module ou matière (requis)
 *     responses:
 *       200:
 *         description: Upload réussi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: ID de l'examen créé
 *                 key:
 *                   type: string
 *                 pages:
 *                   type: integer
 *       400:
 *         description: Fichier manquant ou invalide
 *       401:
 *         description: Non authentifié
 *       413:
 *         description: Fichier trop volumineux (>50MB)
 *       500:
 *         description: Erreur serveur
 */
router.post(
  '/upload',
  authMiddleware,
  upload.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.file) return res.status(400).json({ error: 'Fichier manquant' });

    // Validation du type MIME
    const ALLOWED_MIME_TYPES = ['application/pdf'];
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Seuls les fichiers PDF sont acceptés' });
    }

    // Validation des champs avec Zod
    const result = uploadSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { title, year, module } = result.data;

    // Validation du contenu PDF (rejette les fichiers renommés)
    let pages: number;
    try {
      const pdf = await PDFDocument.load(req.file.buffer);
      pages = pdf.getPageCount();
    } catch {
      return res.status(400).json({ error: "Le fichier n'est pas un PDF valide" });
    }

    const key = objectKey('annales', `${year}`, req.file.originalname.replace(/\s+/g, '_'));
    await uploadBuffer(key, req.file.buffer, req.file.mimetype);

    const exam = await Exam.create({
      title,
      year,
      module,
      fileKey: key,
      pages,
      uploadedBy: req.user!.id,
    });
    res.json({ id: exam._id, key, pages });
  })
);

/**
 * @swagger
 * /files/{examId}/download:
 *   get:
 *     summary: Télécharger le PDF d'un examen
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'examen
 *     responses:
 *       200:
 *         description: Fichier PDF
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: inline; filename="exam.pdf"
 *           Cache-Control:
 *             schema:
 *               type: string
 *               example: public, max-age=3600
 *       401:
 *         description: Non authentifié
 *       400:
 *         description: ID invalide
 *       404:
 *         description: Examen non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/:examId/download',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = examIdParamSchema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { examId } = result.data;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Examen non trouvé' });
    }

    const { stream, contentType, contentLength } = await downloadFile(exam.fileKey);

    res.set({
      'Content-Type': contentType || 'application/pdf',
      'Content-Length': contentLength?.toString(),
      'Content-Disposition': `inline; filename="${exam.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
      'Cache-Control': 'public, max-age=3600',
    });

    stream.pipe(res);

    stream.on('error', error => {
      console.error('Erreur stream S3:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur lors du téléchargement' });
      }
    });
  })
);
