import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors, { CorsOptions } from 'cors';
import mongoose from 'mongoose';
import { router as health } from './routes/health.js';
import { router as exams } from './routes/exams.js';
import { router as files } from './routes/files.js';
import { router as answers } from './routes/answers.js';
import { router as auth } from './routes/auth.js';
import { router as reports } from './routes/reports.js';
import config from './routes/config.js';
import { setupSwagger } from './swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { instanceConfigService } from './services/instance-config.service.js';

const app = express();
app.use(helmet());
app.use(morgan(process.env.API_LOG_LEVEL || 'dev'));
app.use(express.json({ limit: '10mb' }));

// --- CORS strict, uniquement sur /api ---
const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin: allowedOrigins.length ? allowedOrigins : false, // pas d'en-têtes CORS si vide
  credentials: false, // mets true s'il y a des cookies/credentials cross-site
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
  preflightContinue: false,
};

app.use('/api', cors(corsOptions));
app.options('/api/*', cors(corsOptions));

app.use('/api/health', health);
app.use('/api/config', config);
app.use('/api/auth', auth);
app.use('/api/exams', exams);
app.use('/api/files', files);
app.use('/api/answers', answers);
app.use('/api/reports', reports);

setupSwagger(app);
app.use(errorHandler);

const port = Number(process.env.API_PORT || 3000);
const host = process.env.API_HOST ?? '0.0.0.0';

const MONGO_URI = process.env.MONGO_URI as string;
const RETRY_MS = Number(process.env.MONGO_RETRY_MS ?? 2000);
const MAX_RETRIES = Number(process.env.MONGO_MAX_RETRIES ?? 60); // ~2min

async function connectMongoWithRetry() {
  let attempt = 0;
  while (true) {
    try {
      await mongoose.connect(MONGO_URI);
      console.log('[api] mongo connected');
      return;
    } catch (err) {
      attempt++;
      if (attempt >= MAX_RETRIES) {
        console.error('[api] mongo connect failed, giving up:', err);
        process.exit(1);
      }
      console.warn(
        `[api] mongo not ready (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_MS}ms…`
      );
      await new Promise(r => setTimeout(r, RETRY_MS));
    }
  }
}

connectMongoWithRetry().then(() => {
  // Load and validate instance configuration
  try {
    instanceConfigService.loadConfig();
  } catch (error) {
    console.error('[api] Failed to load instance config:', error);
    process.exit(1);
  }

  const server = app.listen(port, host, () => {
    console.log(`[api] listening on http://${host}:${port}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[api] ${signal} received → graceful shutdown…`);
    server.close(() => console.log('[api] http server closed'));
    try {
      await mongoose.disconnect();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
});
