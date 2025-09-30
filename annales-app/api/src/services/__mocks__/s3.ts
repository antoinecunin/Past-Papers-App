import { Readable } from 'stream';

// Mock du service S3 pour les tests
export const uploadBuffer = async (key: string, buffer: Buffer, contentType: string): Promise<void> => {
  console.log(`[MOCK S3] Upload: ${key}, size: ${buffer.length}, type: ${contentType}`);
  return Promise.resolve();
};

export const objectKey = (...parts: string[]): string => {
  return parts.join('/');
};

export const downloadFile = async (
  key: string
): Promise<{ stream: Readable; contentType: string; contentLength: number }> => {
  console.log(`[MOCK S3] Download: ${key}`);
  return {
    stream: Readable.from(['mock pdf content']),
    contentType: 'application/pdf',
    contentLength: 1024,
  };
};