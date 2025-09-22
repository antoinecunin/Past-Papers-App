import { Router } from 'express';
import multer from 'multer';
import { uploadBuffer, objectKey, downloadFile } from '../services/s3.js';
import { Exam } from '../models/Exam.js';
import { Types } from 'mongoose';
// @ts-ignore
import { PDFDocument } from 'pdf-lib';

export const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

/**
 * @openapi
 * /files/upload:
 *   post:
 *     summary: Upload d'un PDF d'annales
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               year:
 *                 type: integer
 *               module:
 *                 type: string
 *     responses:
 *       200: { description: OK }
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'missing file' });
  const { title, year, module } = req.body;
  const key = objectKey('annales', `${year || 'unknown'}`, req.file.originalname.replace(/\s+/g,'_'));
  await uploadBuffer(key, req.file.buffer, req.file.mimetype);

  // lire pages via pdf-lib
  const pdf = await PDFDocument.load(req.file.buffer);
  const pages = pdf.getPageCount();

  const exam = await Exam.create({ title, year, module, fileKey: key, pages });
  res.json({ examId: exam._id, key, pages });
});

/**
 * @openapi
 * /files/{examId}/download:
 *   get:
 *     summary: Télécharger le PDF d'un examen
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
 *       404:
 *         description: Examen non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:examId/download', async (req, res) => {
  try {
    const { examId } = req.params;

    // Validation de l'ObjectId
    if (!Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ error: 'examId invalide' });
    }

    // Recherche de l'examen
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Examen non trouvé' });
    }

    // Téléchargement du fichier depuis S3
    const { stream, contentType, contentLength } = await downloadFile(exam.fileKey);

    // Configuration des headers pour le téléchargement
    res.set({
      'Content-Type': contentType || 'application/pdf',
      'Content-Length': contentLength?.toString(),
      'Content-Disposition': `inline; filename="${exam.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
      'Cache-Control': 'public, max-age=3600', // Cache 1 heure
    });

    // Stream du fichier vers la réponse
    stream.pipe(res);

    stream.on('error', (error) => {
      console.error('Erreur stream S3:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur lors du téléchargement' });
      }
    });

  } catch (error) {
    console.error('Erreur téléchargement:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
});