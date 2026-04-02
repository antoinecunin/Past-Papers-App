import { z } from 'zod';
import { Types } from 'mongoose';

/**
 * Schema Zod pour valider un ObjectId MongoDB
 * @param field Nom du champ (pour les messages d'erreur)
 */
export const objectIdSchema = (field: string) =>
  z
    .string({
      required_error: `${field} (ObjectId) is required`,
    })
    .refine(val => Types.ObjectId.isValid(val), { message: `Invalid ${field} (ObjectId)` });
