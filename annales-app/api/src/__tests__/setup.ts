import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

// Configuration des variables d'environnement pour les tests
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '7d';
process.env.SMTP_HOST = 'test-smtp.example.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_SECURE = 'false';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test-password';
process.env.EMAIL_FROM_NAME = 'Test Annales';
process.env.EMAIL_FROM_ADDRESS = 'test@example.com';
process.env.FRONTEND_URL = 'http://localhost:3080';
process.env.NODE_ENV = 'test'; // Désactive rate limiting

// Setup avant tous les tests
beforeAll(async () => {
  // Créer une instance MongoDB en mémoire
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Se connecter à MongoDB
  await mongoose.connect(mongoUri);
});

// Nettoyage après chaque test
afterEach(async () => {
  // Nettoyer toutes les collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Nettoyage après tous les tests
afterAll(async () => {
  // Déconnecter de MongoDB
  await mongoose.disconnect();
  // Arrêter le serveur MongoDB en mémoire
  await mongoServer.stop();
});