import { FastifyInstance } from 'fastify';
import { CreateOrderUseCase } from '../../../application/use-cases/create-order.use-case';
import { GetOrderUseCase } from '../../../application/use-cases/get-order.use-case';
import { UpdateOrderStatusUseCase } from '../../../application/use-cases/update-order-status.use-case';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  orderIdParamSchema,
} from '../schemas/order.schema';

interface OrderRoutesDeps {
  createOrder: CreateOrderUseCase;
  getOrder: GetOrderUseCase;
  updateOrderStatus: UpdateOrderStatusUseCase;
}

const orderItemSwaggerSchema = {
  type: 'object',
  required: ['productId', 'productName', 'quantity', 'unitPrice'],
  properties: {
    productId: { type: 'string' },
    productName: { type: 'string' },
    quantity: { type: 'integer', minimum: 1 },
    unitPrice: { type: 'number', minimum: 0.01 },
  },
};

const orderResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    customerId: { type: 'string' },
    customerEmail: { type: 'string', format: 'email' },
    items: { type: 'array', items: orderItemSwaggerSchema },
    status: {
      type: 'string',
      enum: ['criado', 'em_processamento', 'enviado', 'entregue'],
    },
    totalAmount: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const orderResponseErroSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

export async function orderRoutes(fastify: FastifyInstance, deps: OrderRoutesDeps): Promise<void> {
  fastify.post(
    '/orders',
    {
      schema: {
        tags: ['Orders'],
        summary: 'Create a new order',
        body: {
          type: 'object',
          required: ['customerId', 'customerEmail', 'items'],
          properties: {
            customerId: { type: 'string' },
            customerEmail: { type: 'string', format: 'email' },
            items: { type: 'array', items: orderItemSwaggerSchema, minItems: 1 },
          },
        },
        response: {
          201: { description: 'Order created', ...orderResponseSchema },
          400: {
            description: 'Validation error',
            ...orderResponseErroSchema,
          },
        },
      },
    },
    async (request, reply) => {
      const body = createOrderSchema.parse(request.body);
      const result = await deps.createOrder.execute(body);
      return reply.status(201).send(result);
    },
  );

  fastify.get(
    '/orders/:id',
    {
      schema: {
        tags: ['Orders'],
        summary: 'Get an order by ID',
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        response: {
          200: { description: 'Order found', ...orderResponseSchema },
          404: {
            description: 'Order not found',
            ...orderResponseErroSchema,
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = orderIdParamSchema.parse(request.params);
      const result = await deps.getOrder.execute(id);
      return reply.status(200).send(result);
    },
  );

  fastify.patch(
    '/orders/:id/status',
    {
      schema: {
        tags: ['Orders'],
        summary: 'Update the status of an order',
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['criado', 'em_processamento', 'enviado', 'entregue'],
            },
          },
        },
        response: {
          200: { description: 'Status updated', ...orderResponseSchema },
          404: { description: 'Order not found', ...orderResponseErroSchema },
          422: { description: 'Invalid status transition', ...orderResponseErroSchema },
        },
      },
    },
    async (request, reply) => {
      const { id } = orderIdParamSchema.parse(request.params);
      const { status } = updateOrderStatusSchema.parse(request.body);
      const result = await deps.updateOrderStatus.execute({ orderId: id, newStatus: status });
      return reply.status(200).send(result);
    },
  );
}
