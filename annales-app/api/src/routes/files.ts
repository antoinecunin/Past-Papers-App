import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { uploadBuffer, objectKey, downloadFile } from '../services/s3.js';
import { imageService } from '../services/image.service.js';
import { extractPdfText } from '../services/pdf-extract.service.js';
import { indexExam } from '../services/search.service.js';
import { Exam } from '../models/Exam.js';
import { PDFDocument } from 'pdf-lib';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { objectIdSchema } from '../utils/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { instanceConfigService } from '../services/instance-config.service.js';

export const router = Router();
// Created per-request instead of at module level because the instance config
// (which defines maxFileSizeMB) is loaded after route modules are imported.
const getUploadMiddleware = () =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: instanceConfigService.getConfig().uploads.maxFileSizeMB * 1024 * 1024 },
  });
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const currentYear = new Date().getFullYear();

const uploadSchema = z.object({
  title: z.string({ required_error: 'Title is required' }).min(1, 'Title is required'),
  year: z
    .string()
    .transform(Number)
    .pipe(
      z
        .number()
        .int()
        .min(1900, 'Invalid year')
        .max(currentYear + 1, 'Invalid year')
    ),
  module: z.string({ required_error: 'Module is required' }).min(1, 'Module is required'),
});

const examIdParamSchema = z.object({
  examId: objectIdSchema('examId'),
});

/**
 * @swagger
 * /files/upload:
 *   post:
 *     summary: Upload an exam PDF
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
 *                 description: PDF file to upload (max size configured per instance)
 *               title:
 *                 type: string
 *                 description: Exam title
 *               year:
 *                 type: integer
 *                 description: Exam year (required)
 *               module:
 *                 type: string
 *                 description: Module or subject (required)
 *     responses:
 *       200:
 *         description: Upload successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: ID of the created exam
 *                 key:
 *                   type: string
 *                 pages:
 *                   type: integer
 *       400:
 *         description: Missing or invalid file
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Upload permission revoked
 *       413:
 *         description: File too large or storage quota exceeded
 *       500:
 *         description: Server error
 */
router.post(
  '/upload',
  authMiddleware,
  (req, res, next) => {
    const upload = getUploadMiddleware();
    upload.single('file')(req, res, (err: unknown) => {
      if (err && (err as { code?: string }).code === 'LIMIT_FILE_SIZE') {
        const maxMB = instanceConfigService.getConfig().uploads.maxFileSizeMB;
        return res.status(413).json({ error: `File too large (max ${maxMB}MB)` });
      }
      next(err);
    });
  },
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user!.canUpload) {
      return res.status(403).json({ error: 'Your upload permission has been revoked' });
    }

    if (!req.file) return res.status(400).json({ error: 'Missing file' });

    // Validation du type MIME
    const ALLOWED_MIME_TYPES = ['application/pdf'];
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only PDF files are accepted' });
    }

    // Validation des champs avec Zod
    const result = uploadSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { title, year, module } = result.data;

    // Check storage quota
    const { maxStorageMB } = instanceConfigService.getConfig().uploads;
    const maxStorageBytes = maxStorageMB * 1024 * 1024;
    const [{ totalSize = 0 } = {}] = await Exam.aggregate([
      { $group: { _id: null, totalSize: { $sum: '$fileSize' } } },
    ]);
    if (totalSize + req.file.size > maxStorageBytes) {
      return res.status(413).json({ error: `Storage quota exceeded (max ${maxStorageMB}MB)` });
    }

    // Validation du contenu PDF (rejette les fichiers renommés)
    let pages: number;
    try {
      const pdf = await PDFDocument.load(req.file.buffer);
      pages = pdf.getPageCount();
    } catch {
      return res.status(400).json({ error: 'The file is not a valid PDF' });
    }

    const key = objectKey('exams', `${year}`, req.file.originalname.replace(/\s+/g, '_'));
    await uploadBuffer(key, req.file.buffer, req.file.mimetype);

    const exam = await Exam.create({
      title,
      year,
      module,
      fileKey: key,
      fileSize: req.file.size,
      pages,
      uploadedBy: req.user!.id,
    });

    // Text extraction drives search: a PDF with no extractable text is
    // flagged non-searchable so the UI can tell the user upfront rather
    // than letting them think search is broken.
    try {
      const extraction = await extractPdfText(req.file.buffer);
      exam.searchable = extraction.searchable;
      await exam.save();
      if (extraction.searchable) {
        void indexExam(
          {
            examId: exam._id.toString(),
            examTitle: exam.title,
            module: exam.module,
            year: exam.year,
          },
          extraction.pages
        );
      }
    } catch (err) {
      console.warn(
        `[exam upload] text extraction failed for ${exam._id}: ${(err as Error).message}`
      );
      exam.searchable = false;
      await exam.save();
    }

    res.json({ id: exam._id, key, pages });
  })
);

/**
 * @swagger
 * /files/{examId}/download:
 *   get:
 *     summary: Download an exam PDF
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 *         description: Exam ID
 *     responses:
 *       200:
 *         description: PDF file
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
 *         description: Not authenticated
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Exam not found
 *       500:
 *         description: Server error
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
      return res.status(404).json({ error: 'Exam not found' });
    }

    const { stream, contentType, contentLength } = await downloadFile(exam.fileKey);

    res.set({
      'Content-Type': contentType || 'application/pdf',
      'Content-Length': contentLength?.toString(),
      'Content-Disposition': `inline; filename="${exam.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    });

    stream.pipe(res);

    stream.on('error', error => {
      console.error('S3 stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error during download' });
      }
    });
  })
);

// ─── Image upload/serving for comments ───

const IMAGE_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

/**
 * @swagger
 * /files/image:
 *   post:
 *     summary: Upload an image for a comment (converted to WebP)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (max 5MB, converted to WebP)
 *     responses:
 *       200:
 *         description: Image uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 key:
 *                   type: string
 *                   description: S3 key (e.g. "images/uuid.webp")
 *       400:
 *         description: Invalid file
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Commenting permission revoked
 */
router.post(
  '/image',
  authMiddleware,
  imageUpload.single('image'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user!.canComment) {
      return res.status(403).json({ error: 'Your commenting permission has been revoked' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Missing image' });
    }

    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are accepted' });
    }

    const key = await imageService.processAndUpload(req.file.buffer);
    return res.json({ key });
  })
);

/**
 * @swagger
 * /files/image/{filename}:
 *   get:
 *     summary: Serve a comment image
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Image filename (uuid.webp)
 *     responses:
 *       200:
 *         description: Image file (WebP)
 *       400:
 *         description: Invalid filename
 *       404:
 *         description: Image not found
 *       500:
 *         description: Server error
 */
router.get(
  '/image/:filename',
  asyncHandler(async (req, res) => {
    const { filename } = req.params;

    if (!IMAGE_KEY_PATTERN.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const key = objectKey('images', filename);

    try {
      const { stream, contentLength } = await downloadFile(key);

      res.set({
        'Content-Type': 'image/webp',
        'Content-Length': contentLength?.toString(),
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      });

      stream.pipe(res);

      stream.on('error', error => {
        console.error('Image stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error during download' });
        }
      });
    } catch {
      return res.status(404).json({ error: 'Image not found' });
    }
  })
);
