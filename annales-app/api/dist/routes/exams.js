import { Router } from 'express';
import { Exam } from '../models/Exam.js';
import { Types } from 'mongoose';
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
/**
 * @openapi
 * /exams/{id}:
 *   get:
 *     summary: Récupère un examen par son ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Examen trouvé
 *       404:
 *         description: Examen non trouvé
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Vérifier que l'ID est un ObjectId valide
        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID invalide' });
        }
        const exam = await Exam.findById(id).lean();
        if (!exam) {
            return res.status(404).json({ error: 'Examen non trouvé' });
        }
        res.json(exam);
    }
    catch (error) {
        console.error("Erreur lors de la récupération de l'examen:", error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
