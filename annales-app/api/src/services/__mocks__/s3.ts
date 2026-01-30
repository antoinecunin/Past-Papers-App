import { Readable } from 'stream';

// Mock du service S3 pour les tests
export const uploadBuffer = async (
  key: string,
  _buffer: Buffer,
  contentType: string
): Promise<void> => {
  console.log(`[MOCK S3] Upload: ${key}, type: ${contentType}`);
  return Promise.resolve();
};

export const objectKey = (...parts: string[]): string => {
  return parts.join('/');
};

export const downloadFile = async (
  key: string
): Promise<{ stream: Readable; contentType: string; contentLength: number }> => {
  console.log(`[MOCK S3] Download: ${key}`);

  // Créer un stream qui se termine correctement pour supertest
  const content = Buffer.from('%PDF-1.4 mock pdf content');
  const stream = new Readable({
    read() {
      this.push(content);
      this.push(null); // Signal de fin de stream
    },
  });

  return {
    stream,
    contentType: 'application/pdf',
    contentLength: content.length,
  };
};

export const deleteFile = async (key: string): Promise<void> => {
  console.log(`[MOCK S3] Delete: ${key}`);
  return Promise.resolve();
};
