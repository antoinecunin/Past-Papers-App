// Configuration des variables d'environnement pour les tests
// Ce fichier est chargé en premier via setupFiles dans jest.config.js

// Variables d'environnement pour les tests (AVANT les imports)
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '7d';
process.env.SMTP_HOST = 'test-smtp.example.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_SECURE = 'false';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test-password';
process.env.EMAIL_FROM_NAME = 'Test Platform';
process.env.EMAIL_FROM_ADDRESS = 'test@example.com';
process.env.FRONTEND_URL = 'http://localhost:3080';
process.env.S3_REGION = 'us-east-1';
process.env.S3_ENDPOINT = 'localhost:9000';
process.env.S3_BUCKET = 'test-bucket';
process.env.S3_ACCESS_KEY = 'test-access-key';
process.env.S3_SECRET_KEY = 'test-secret-key';

import { jest } from '@jest/globals';
import { Readable } from 'stream';

// Mock @aws-sdk/client-s3 (bibliothèque externe)
jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockImplementation((command: unknown) => {
      const cmd = command as { constructor: { name: string } };
      if (cmd.constructor.name === 'GetObjectCommand') {
        return Promise.resolve({
          Body: Readable.from(['mock pdf content']),
          ContentType: 'application/pdf',
          ContentLength: 1024,
        });
      }
      return Promise.resolve({});
    }),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

// Mock nodemailer (bibliothèque externe)
jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest
        .fn<() => Promise<{ messageId: string }>>()
        .mockResolvedValue({ messageId: 'mock-message-id' }),
    }),
  },
}));

// Mock pdf-lib (bibliothèque externe)
jest.unstable_mockModule('pdf-lib', () => ({
  PDFDocument: {
    load: jest.fn<() => Promise<{ getPageCount: () => number }>>().mockResolvedValue({
      getPageCount: () => 5,
    }),
  },
}));
