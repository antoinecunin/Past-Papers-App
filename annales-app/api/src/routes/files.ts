import { Router } from 'express';
import multer from 'multer';
import { uploadBuffer, objectKey } from '../services/s3.js';
import { Exam } from '../models/Exam.js';
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