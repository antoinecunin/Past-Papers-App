import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { uploadBuffer, deleteFile, objectKey } from './s3.js';

const MAX_INPUT_SIZE = 5 * 1024 * 1024; // 5 Mo
const WEBP_QUALITY = 80;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'gif', 'webp', 'tiff', 'avif']);

class ImageService {
  /**
   * Valide le buffer (magic bytes), convertit en WebP (strip EXIF), upload dans S3.
   * @returns La clé S3 de l'image (ex: "images/550e8400-e29b-41d4-a716-446655440000.webp")
   */
  async processAndUpload(buffer: Buffer): Promise<string> {
    if (buffer.length > MAX_INPUT_SIZE) {
      throw new Error('Image trop volumineuse (max 5 Mo)');
    }

    // Valider le format via magic bytes (sharp parse le header)
    const metadata = await sharp(buffer).metadata();
    if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
      throw new Error("Format d'image non supporté");
    }

    // Convertir en WebP, auto-rotate depuis EXIF puis strip metadata
    const webpBuffer = await sharp(buffer)
      .rotate() // applique l'orientation EXIF avant suppression
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const key = objectKey('images', `${randomUUID()}.webp`);
    await uploadBuffer(key, webpBuffer, 'image/webp');
    return key;
  }

  /**
   * Supprime une image de S3.
   */
  async delete(key: string): Promise<void> {
    await deleteFile(key);
  }
}

export const imageService = new ImageService();
