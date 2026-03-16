import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

import { orderRoutes } from './routes/order.routes';
import { healthRoutes } from './routes/health.routes';
import { buildErrorHandler } from './middlewares/error-handler.middleware';

import { CreateOrderUseCase } from '../../application/use-cases/create-order.use-case';
import { GetOrderUseCase } from '../../application/use-cases/get-order.use-case';
import { UpdateOrderStatusUseCase } from '../../application/use-cases/update-order-status.use-case';
import { ILogger } from '../../application/ports/logger.port';

interface AppDeps {
  createOrder: CreateOrderUseCase;
  getOrder: GetOrderUseCase;
  updateOrderStatus: UpdateOrderStatusUseCase;
  logger: ILogger;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    trustProxy: true,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: true });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Order Service API',
        description: 'E-commerce Order Management Service',
        version: '1.0.0',
      },
      tags: [
        { name: 'Orders', description: 'Order management endpoints' },
        { name: 'Health', description: 'Service health' },
      ],
      components: {
        securitySchemes: {},
      },
    },
  });

  await app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: false },
  });

  app.setErrorHandler(buildErrorHandler(deps.logger));

  await app.register(healthRoutes);
  await app.register(orderRoutes, deps);

  app.addHook('onRequest', async (request) => {
    deps.logger.info('Incoming request', {
      method: request.method,
      url: request.url,
      requestId: request.id,
    });
  });

  app.addHook('onResponse', async (request, reply) => {
    deps.logger.info('Request completed', {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      requestId: request.id,
    });
  });

  return app;
}
