import { CreateOrderUseCase } from '../../../src/application/use-cases/create-order.use-case';
import { IOrderRepository } from '../../../src/application/ports/order-repository.port';
import { ILogger } from '../../../src/application/ports/logger.port';
import { Order } from '../../../src/domain/entities/order.entity';
import { OrderStatus } from '../../../src/domain/value-objects/order-status.vo';

const mockRepository: jest.Mocked<IOrderRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
};

const mockLogger: jest.Mocked<ILogger> = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateOrderUseCase(mockRepository, mockLogger);
  });

  const input = {
    customerId: 'cust-001',
    customerEmail: 'user@example.com',
    items: [{ productId: 'prod-1', productName: 'Item A', quantity: 1, unitPrice: 50 }],
  };

  it('should create and persist an order', async () => {
    const savedOrder = Order.create(input);
    mockRepository.save.mockResolvedValue(savedOrder);

    const result = await useCase.execute(input);

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(result.customerId).toBe(input.customerId);
    expect(result.status).toBe(OrderStatus.CREATED);
    expect(result.totalAmount).toBe(50);
  });

  it('should log info on success', async () => {
    const savedOrder = Order.create(input);
    mockRepository.save.mockResolvedValue(savedOrder);

    await useCase.execute(input);

    expect(mockLogger.info).toHaveBeenCalledWith('Creating new order', expect.any(Object));
    expect(mockLogger.info).toHaveBeenCalledWith('Order created successfully', expect.any(Object));
  });

  it('should propagate repository errors', async () => {
    mockRepository.save.mockRejectedValue(new Error('DB failure'));

    await expect(useCase.execute(input)).rejects.toThrow('DB failure');
  });

  it('should propagate domain validation errors', async () => {
    const { InvalidOrderError } = await import('../../../src/domain/errors/domain-errors');
    await expect(useCase.execute({ ...input, customerId: '' })).rejects.toThrow(InvalidOrderError);
  });
});
