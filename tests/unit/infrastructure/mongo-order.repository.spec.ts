import { MongoOrderRepository } from '../../../src/infrastructure/database/repositories/mongo-order.repository';
import { OrderModel } from '../../../src/infrastructure/database/models/order.model';
import { Order } from '../../../src/domain/entities/order.entity';
import { OrderStatus } from '../../../src/domain/value-objects/order-status.vo';

jest.mock('../../../src/infrastructure/database/models/order.model');

const MockOrderModel = OrderModel as jest.Mocked<typeof OrderModel>;

const sampleOrder = Order.create({
  customerId: 'c1',
  customerEmail: 'x@y.com',
  items: [{ productId: 'p1', productName: 'A', quantity: 2, unitPrice: 25 }],
});

const docStub = {
  _id: sampleOrder.id,
  customerId: sampleOrder.customerId,
  customerEmail: sampleOrder.customerEmail,
  items: sampleOrder.items.map((i) => i.toJSON()),
  status: OrderStatus.CREATED,
  totalAmount: 50,
  createdAt: sampleOrder.createdAt,
  updatedAt: sampleOrder.updatedAt,
};

describe('MongoOrderRepository', () => {
  let repo: MongoOrderRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new MongoOrderRepository();
  });

  describe('save()', () => {
    it('should save and return domain order', async () => {
      (MockOrderModel.create as jest.Mock).mockResolvedValue(docStub);

      const result = await repo.save(sampleOrder);

      expect(MockOrderModel.create).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(Order);
      expect(result.id).toBe(sampleOrder.id);
    });
  });

  describe('findById()', () => {
    it('should return domain order when found', async () => {
      const execMock = jest.fn().mockResolvedValue(docStub);
      const leanMock = jest.fn().mockReturnValue({ exec: execMock });
      (MockOrderModel.findById as jest.Mock).mockReturnValue({ lean: leanMock });

      const result = await repo.findById(sampleOrder.id);

      expect(result).toBeInstanceOf(Order);
      expect(result?.id).toBe(sampleOrder.id);
    });

    it('should return null when order not found', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      const leanMock = jest.fn().mockReturnValue({ exec: execMock });
      (MockOrderModel.findById as jest.Mock).mockReturnValue({ lean: leanMock });

      const result = await repo.findById('not-found');

      expect(result).toBeNull();
    });
  });

  describe('update()', () => {
    it('should update and return domain order', async () => {
      const updatedDoc = { ...docStub, status: OrderStatus.PROCESSING };
      const execMock = jest.fn().mockResolvedValue(updatedDoc);
      (MockOrderModel.findByIdAndUpdate as jest.Mock).mockReturnValue({ exec: execMock });

      const orderToUpdate = Order.reconstitute({
        id: sampleOrder.id,
        customerId: 'c1',
        customerEmail: 'x@y.com',
        items: [{ productId: 'p1', productName: 'A', quantity: 2, unitPrice: 25 }],
        status: OrderStatus.PROCESSING,
      });

      const result = await repo.update(orderToUpdate);

      expect(result).toBeInstanceOf(Order);
      expect(MockOrderModel.findByIdAndUpdate).toHaveBeenCalledWith(
        sampleOrder.id,
        expect.any(Object),
        { new: true },
      );
    });

    it('should throw if order not found during update', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      (MockOrderModel.findByIdAndUpdate as jest.Mock).mockReturnValue({ exec: execMock });

      await expect(repo.update(sampleOrder)).rejects.toThrow(/not found during update/);
    });
  });
});
