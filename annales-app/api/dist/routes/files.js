import { Router } from 'express';
import multer from 'multer';
import { uploadBuffer, objectKey, downloadFile } from '../services/s3.js';
import { Exam } from '../models/Exam.js';
import { Types } from 'mongoose';
import { PDFDocument } from 'pdf-lib';
import { authMiddleware } from '../middleware/auth.js';
export const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
/**
 * @openapi
 * /files/upload:
 *   post:
 *     summary: Upload d'un PDF d'annales
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
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
 *                 description: Année de l'examen
 *               module:
 *                 type: string
 *                 description: Module ou matière
 *     responses:
 *       200:
 *         description: Upload réussi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 examId:
 *                   type: string
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
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'missing file' });
    const { title, year, module } = req.body;
    const key = objectKey('annales', `${year || 'unknown'}`, req.file.originalname.replace(/\s+/g, '_'));
    await uploadBuffer(key, req.file.buffer, req.file.mimetype);
    // lire pages via pdf-lib
    const pdf = await PDFDocument.load(req.file.buffer);
    const pages = pdf.getPageCount();
    const exam = await Exam.create({
        title,
        year,
        module,
        fileKey: key,
        pages,
        uploadedBy: req.user.id,
    });
    res.json({ examId: exam._id, key, pages });
});
/**
 * @openapi
 * /files/{examId}/download:
 *   get:
 *     summary: Télécharger le PDF d'un examen
 *     tags: [Files]
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
 *       400:
 *         description: ID invalide
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
        stream.on('error', error => {
            console.error('Erreur stream S3:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Erreur lors du téléchargement' });
            }
        });
    }
    catch (error) {
        console.error('Erreur téléchargement:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Erreur serveur' });
        }
    }
});
