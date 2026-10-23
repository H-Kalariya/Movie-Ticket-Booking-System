import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

export async function connectDb() {
  mongoose.connection.on('connected', () => console.log('[db] connected'));
  mongoose.connection.on('error', (e) => console.error('[db] error', e.message));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
