import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

// Les variables d'environnement sont configurées dans setup-mocks.ts

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
