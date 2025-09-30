import { Readable } from 'stream';

/**
 * Mock S3 service pour les tests
 * Simule les opérations S3 sans faire d'appels réels
 */
export class MockS3Service {
  private storage = new Map<string, Buffer>();

  async uploadBuffer(key: string, buffer: Buffer): Promise<void> {
    this.storage.set(key, buffer);
  }

  async downloadFile(key: string): Promise<{ stream: Readable; contentType: string }> {
    const buffer = this.storage.get(key);
    if (!buffer) {
      throw new Error('File not found');
    }

    const stream = Readable.from(buffer);
    return {
      stream,
      contentType: 'application/pdf',
    };
  }

  async deleteFile(key: string): Promise<void> {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  has(key: string): boolean {
    return this.storage.has(key);
  }
}

export const mockS3 = new MockS3Service();