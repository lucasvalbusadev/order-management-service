import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { buildApp } from '../../src/infrastructure/http/app';
import { MongoOrderRepository } from '../../src/infrastructure/database/repositories/mongo-order.repository';
import { CreateOrderUseCase } from '../../src/application/use-cases/create-order.use-case';
import { GetOrderUseCase } from '../../src/application/use-cases/get-order.use-case';
import { UpdateOrderStatusUseCase } from '../../src/application/use-cases/update-order-status.use-case';
import { IMessageBroker } from '../../src/application/ports/message-broker.port';
import { ILogger } from '../../src/application/ports/logger.port';
import { FastifyInstance } from 'fastify';

const mockBroker: jest.Mocked<IMessageBroker> = {
  publish: jest.fn().mockResolvedValue(undefined),
  close: jest.fn(),
};

const mockLogger: jest.Mocked<ILogger> = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

let mongod: MongoMemoryServer;
let app: FastifyInstance;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const repo = new MongoOrderRepository();
  const createOrder = new CreateOrderUseCase(repo, mockLogger);
  const getOrder = new GetOrderUseCase(repo, mockLogger);
  const updateOrderStatus = new UpdateOrderStatusUseCase(repo, mockBroker, mockLogger);

  app = await buildApp({ createOrder, getOrder, updateOrderStatus, logger: mockLogger });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(() => jest.clearAllMocks());

const validPayload = {
  customerId: 'cust-integration-01',
  customerEmail: 'integration@test.com',
  items: [{ productId: 'prod-a', productName: 'Produto A', quantity: 2, unitPrice: 49.99 }],
};

describe('GET /health', () => {
  it('should return 200 with status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('connected');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });
});

describe('POST /orders', () => {
  it('should create a new order and return 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: validPayload,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.status).toBe('criado');
    expect(body.totalAmount).toBeCloseTo(99.98);
    expect(body.customerEmail).toBe('integration@test.com');
  });

  it('should return 400 for missing customerId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: { ...validPayload, customerId: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for invalid email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: { ...validPayload, customerEmail: 'not-email' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for empty items array', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: { ...validPayload, items: [] },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /orders/:id', () => {
  it('should return 200 with the order', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: validPayload,
    });
    const { id } = created.json();

    const res = await app.inject({ method: 'GET', url: `/orders/${id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(id);
  });

  it('should return 404 for unknown order', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/orders/00000000-0000-0000-0000-000000000000',
    });
    expect(res.statusCode).toBe(404);
  });

  it('should return 400 for invalid UUID format', async () => {
    const res = await app.inject({ method: 'GET', url: '/orders/not-a-uuid' });
    expect(res.statusCode).toBe(400);
  });
});

describe('PATCH /orders/:id/status', () => {
  it('should update status and return 200', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: validPayload,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'PATCH',
      url: `/orders/${id}/status`,
      payload: { status: 'em_processamento' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('em_processamento');
  });

  it('should publish a message to broker on status update', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: validPayload,
    });
    const { id } = created.json();

    await app.inject({
      method: 'PATCH',
      url: `/orders/${id}/status`,
      payload: { status: 'em_processamento' },
    });

    expect(mockBroker.publish).toHaveBeenCalledWith(
      'orders',
      'order.status.changed',
      expect.objectContaining({ orderId: id }),
    );
  });

  it('should return 422 for invalid status transition', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: validPayload,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'PATCH',
      url: `/orders/${id}/status`,
      payload: { status: 'entregue' },
    });

    expect(res.statusCode).toBe(422);
  });

  it('should return 400 for invalid status value', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: validPayload,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'PATCH',
      url: `/orders/${id}/status`,
      payload: { status: 'status_invalido' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return 404 for non-existent order', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/orders/00000000-0000-0000-0000-000000000000/status',
      payload: { status: 'em_processamento' },
    });
    expect(res.statusCode).toBe(404);
  });
});
