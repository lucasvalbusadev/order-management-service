import { UpdateOrderStatusUseCase } from '../../../src/application/use-cases/update-order-status.use-case';
import { IOrderRepository } from '../../../src/application/ports/order-repository.port';
import { IMessageBroker } from '../../../src/application/ports/message-broker.port';
import { ILogger } from '../../../src/application/ports/logger.port';
import { Order } from '../../../src/domain/entities/order.entity';
import { OrderStatus } from '../../../src/domain/value-objects/order-status.vo';
import {
  OrderNotFoundError,
  InvalidStatusTransitionError,
} from '../../../src/domain/errors/domain-errors';

const makeOrder = (status?: string) =>
  Order.reconstitute({
    id: 'order-uuid-123',
    customerId: 'cust-1',
    customerEmail: 'u@test.com',
    items: [{ productId: 'p1', productName: 'A', quantity: 1, unitPrice: 100 }],
    status: status ?? OrderStatus.CREATED,
  });

const mockRepository: jest.Mocked<IOrderRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
};

const mockBroker: jest.Mocked<IMessageBroker> = {
  publish: jest.fn(),
  close: jest.fn(),
};

const mockLogger: jest.Mocked<ILogger> = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('UpdateOrderStatusUseCase', () => {
  let useCase: UpdateOrderStatusUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateOrderStatusUseCase(mockRepository, mockBroker, mockLogger);
  });

  it('should update status and publish event', async () => {
    const order = makeOrder();
    const updated = makeOrder(OrderStatus.PROCESSING);
    mockRepository.findById.mockResolvedValue(order);
    mockRepository.update.mockResolvedValue(updated);
    mockBroker.publish.mockResolvedValue(undefined);

    const result = await useCase.execute({
      orderId: 'order-uuid-123',
      newStatus: OrderStatus.PROCESSING,
    });

    expect(result.status).toBe(OrderStatus.PROCESSING);
    expect(mockRepository.update).toHaveBeenCalled();
    expect(mockBroker.publish).toHaveBeenCalledWith(
      'orders',
      'order.status.changed',
      expect.objectContaining({
        orderId: 'order-uuid-123',
        previousStatus: OrderStatus.CREATED,
        newStatus: OrderStatus.PROCESSING,
      }),
    );
  });

  it('should throw OrderNotFoundError when order not found', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ orderId: 'ghost-id', newStatus: OrderStatus.PROCESSING }),
    ).rejects.toThrow(OrderNotFoundError);
  });

  it('should throw InvalidStatusTransitionError for illegal transition', async () => {
    const order = makeOrder(OrderStatus.CREATED);
    mockRepository.findById.mockResolvedValue(order);

    await expect(
      useCase.execute({ orderId: 'order-uuid-123', newStatus: OrderStatus.DELIVERED }),
    ).rejects.toThrow(InvalidStatusTransitionError);
  });

  it('should NOT throw if broker publish fails (non-blocking)', async () => {
    const order = makeOrder(OrderStatus.CREATED);
    const updated = makeOrder(OrderStatus.PROCESSING);
    mockRepository.findById.mockResolvedValue(order);
    mockRepository.update.mockResolvedValue(updated);
    mockBroker.publish.mockRejectedValue(new Error('broker down'));

    const result = await useCase.execute({
      orderId: 'order-uuid-123',
      newStatus: OrderStatus.PROCESSING,
    });

    expect(result.status).toBe(OrderStatus.PROCESSING);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to publish status change event',
      expect.any(Object),
    );
  });

  it('should log info on successful update', async () => {
    const order = makeOrder(OrderStatus.CREATED);
    const updated = makeOrder(OrderStatus.PROCESSING);
    mockRepository.findById.mockResolvedValue(order);
    mockRepository.update.mockResolvedValue(updated);
    mockBroker.publish.mockResolvedValue(undefined);

    await useCase.execute({ orderId: 'order-uuid-123', newStatus: OrderStatus.PROCESSING });

    expect(mockLogger.info).toHaveBeenCalledWith('Updating order status', expect.any(Object));
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Status change event published',
      expect.any(Object),
    );
  });
});
