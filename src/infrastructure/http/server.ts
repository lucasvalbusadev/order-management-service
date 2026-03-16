import 'dotenv/config';
import { loadConfig } from '../config/app.config';
import { PinoLogger } from '../logger/pino.logger';
import { connectMongo, disconnectMongo } from '../database/mongo.connection';
import { RabbitMQBroker } from '../messaging/rabbitmq.broker';
import { MongoOrderRepository } from '../database/repositories/mongo-order.repository';
import { CreateOrderUseCase } from '../../application/use-cases/create-order.use-case';
import { GetOrderUseCase } from '../../application/use-cases/get-order.use-case';
import { UpdateOrderStatusUseCase } from '../../application/use-cases/update-order-status.use-case';
import { buildApp } from './app';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = new PinoLogger();

  logger.info('Starting order-service', { env: config.nodeEnv, port: config.port });

  await connectMongo(config.mongoUri, logger);

  const broker = new RabbitMQBroker(config.rabbitMqUrl, logger);
  try {
    await broker.connect();
  } catch {
    logger.warn('RabbitMQ unavailable at startup — messaging will fail until reconnected');
  }

  const orderRepository = new MongoOrderRepository();
  const createOrder = new CreateOrderUseCase(orderRepository, logger);
  const getOrder = new GetOrderUseCase(orderRepository, logger);
  const updateOrderStatus = new UpdateOrderStatusUseCase(orderRepository, broker, logger);

  const app = await buildApp({ createOrder, getOrder, updateOrderStatus, logger });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    try {
      await app.close();
      await broker.close();
      await disconnectMongo();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  await app.listen({ port: config.port, host: '0.0.0.0' });
  logger.info(`Server listening on port ${config.port}`);
  logger.info(`Swagger docs available at http://localhost:${config.port}/docs`);
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
