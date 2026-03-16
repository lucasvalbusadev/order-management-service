import mongoose from 'mongoose';
import { ILogger } from '../../application/ports/logger.port';

export async function connectMongo(uri: string, logger: ILogger): Promise<void> {
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error', { error: err.message }));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
