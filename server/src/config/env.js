import 'dotenv/config';

function required(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/curtaincall'),
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
    refreshTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  },
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@cinema.com',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@123',
    ownerEmail: process.env.SEED_OWNER_EMAIL || 'owner@cinema.com',
    ownerPassword: process.env.SEED_OWNER_PASSWORD || 'Owner@123',
  },
};

export const isProd = env.nodeEnv === 'production';
