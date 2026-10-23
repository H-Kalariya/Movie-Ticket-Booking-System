import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env, isProd } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  // In development, any localhost/127.0.0.1 origin is allowed (Vite may pick a
  // different port). In production, only the explicit CORS_ORIGIN allow-list is honored.
  const isLocalOrigin = (o) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin / tools with no Origin header, and whitelisted origins.
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        if (!isProd && isLocalOrigin(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(morgan(isProd ? 'combined' : 'dev'));

  // Global soft rate limit.
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
