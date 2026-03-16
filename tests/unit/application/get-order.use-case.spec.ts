import { GetOrderUseCase } from '../../../src/application/use-cases/get-order.use-case';
import { IOrderRepository } from '../../../src/application/ports/order-repository.port';
import { ILogger } from '../../../src/application/ports/logger.port';
import { Order } from '../../../src/domain/entities/order.entity';
import { OrderNotFoundError } from '../../../src/domain/errors/domain-errors';

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

const sampleOrder = Order.create({
  customerId: 'c1',
  customerEmail: 'a@b.com',
  items: [{ productId: 'p1', productName: 'X', quantity: 1, unitPrice: 10 }],
});

describe('GetOrderUseCase', () => {
  let useCase: GetOrderUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetOrderUseCase(mockRepository, mockLogger);
  });

  it('should return order primitives when found', async () => {
    mockRepository.findById.mockResolvedValue(sampleOrder);

    const result = await useCase.execute(sampleOrder.id);

    expect(result.id).toBe(sampleOrder.id);
    expect(mockRepository.findById).toHaveBeenCalledWith(sampleOrder.id);
  });

  it('should throw OrderNotFoundError when order does not exist', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent-id')).rejects.toThrow(OrderNotFoundError);
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should log debug on lookup', async () => {
    mockRepository.findById.mockResolvedValue(sampleOrder);

    await useCase.execute(sampleOrder.id);

    expect(mockLogger.debug).toHaveBeenCalledWith('Fetching order', expect.any(Object));
  });
});
