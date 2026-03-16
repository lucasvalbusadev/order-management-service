import { Order } from '../../../src/domain/entities/order.entity';
import { OrderStatus } from '../../../src/domain/value-objects/order-status.vo';
import {
  InvalidOrderError,
  InvalidStatusTransitionError,
} from '../../../src/domain/errors/domain-errors';

const validProps = {
  customerId: 'customer-123',
  customerEmail: 'test@example.com',
  items: [{ productId: 'prod-1', productName: 'Produto A', quantity: 2, unitPrice: 100 }],
};

describe('Order Entity', () => {
  describe('create()', () => {
    it('should create a valid order with default CREATED status', () => {
      const order = Order.create(validProps);
      expect(order.id).toBeDefined();
      expect(order.customerId).toBe('customer-123');
      expect(order.customerEmail).toBe('test@example.com');
      expect(order.status).toBe(OrderStatus.CREATED);
      expect(order.totalAmount).toBe(200);
      expect(order.items).toHaveLength(1);
    });

    it('should throw InvalidOrderError when customerId is empty', () => {
      expect(() => Order.create({ ...validProps, customerId: '' })).toThrow(InvalidOrderError);
    });

    it('should throw InvalidOrderError when customerEmail is invalid', () => {
      expect(() => Order.create({ ...validProps, customerEmail: 'not-an-email' })).toThrow(
        InvalidOrderError,
      );
    });

    it('should throw InvalidOrderError when items array is empty', () => {
      expect(() => Order.create({ ...validProps, items: [] })).toThrow(InvalidOrderError);
    });

    it('should calculate totalAmount correctly for multiple items', () => {
      const order = Order.create({
        ...validProps,
        items: [
          { productId: 'p1', productName: 'A', quantity: 3, unitPrice: 10.5 },
          { productId: 'p2', productName: 'B', quantity: 1, unitPrice: 5.0 },
        ],
      });
      expect(order.totalAmount).toBe(36.5);
    });

    it('should generate unique IDs', () => {
      const o1 = Order.create(validProps);
      const o2 = Order.create(validProps);
      expect(o1.id).not.toBe(o2.id);
    });
  });

  describe('reconstitute()', () => {
    it('should restore order from primitives', () => {
      const order = Order.reconstitute({
        id: 'fixed-id',
        customerId: 'c1',
        customerEmail: 'a@b.com',
        items: [{ productId: 'p1', productName: 'X', quantity: 1, unitPrice: 50 }],
        status: OrderStatus.PROCESSING,
      });
      expect(order.id).toBe('fixed-id');
      expect(order.status).toBe(OrderStatus.PROCESSING);
    });
  });

  describe('updateStatus()', () => {
    it('should allow CREATED -> em_processamento', () => {
      const order = Order.create(validProps);
      order.updateStatus(OrderStatus.PROCESSING);
      expect(order.status).toBe(OrderStatus.PROCESSING);
    });

    it('should allow full transition chain', () => {
      const order = Order.create(validProps);
      order.updateStatus(OrderStatus.PROCESSING);
      order.updateStatus(OrderStatus.SHIPPED);
      order.updateStatus(OrderStatus.DELIVERED);
      expect(order.status).toBe(OrderStatus.DELIVERED);
    });

    it('should throw InvalidStatusTransitionError for invalid transition', () => {
      const order = Order.create(validProps);
      expect(() => order.updateStatus(OrderStatus.DELIVERED)).toThrow(InvalidStatusTransitionError);
    });

    it('should throw InvalidStatusTransitionError when skipping a step', () => {
      const order = Order.create(validProps);
      expect(() => order.updateStatus(OrderStatus.SHIPPED)).toThrow(InvalidStatusTransitionError);
    });

    it('should throw when trying to transition from DELIVERED', () => {
      const order = Order.reconstitute({
        ...validProps,
        id: 'x',
        status: OrderStatus.DELIVERED,
      });
      expect(() => order.updateStatus(OrderStatus.SHIPPED)).toThrow(InvalidStatusTransitionError);
    });

    it('should update updatedAt timestamp on status change', () => {
      const order = Order.create(validProps);
      const before = order.updatedAt.getTime();
      order.updateStatus(OrderStatus.PROCESSING);
      expect(order.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    });
  });

  describe('isDelivered()', () => {
    it('should return false for non-delivered orders', () => {
      const order = Order.create(validProps);
      expect(order.isDelivered()).toBe(false);
    });

    it('should return true for delivered orders', () => {
      const order = Order.reconstitute({ ...validProps, id: 'x', status: OrderStatus.DELIVERED });
      expect(order.isDelivered()).toBe(true);
    });
  });

  describe('toPrimitives()', () => {
    it('should serialize correctly', () => {
      const order = Order.create(validProps);
      const primitives = order.toPrimitives();
      expect(primitives.id).toBe(order.id);
      expect(primitives.status).toBe(OrderStatus.CREATED);
      expect(primitives.totalAmount).toBe(200);
      expect(primitives.createdAt).toBeInstanceOf(Date);
      expect(primitives.updatedAt).toBeInstanceOf(Date);
    });
  });
});
