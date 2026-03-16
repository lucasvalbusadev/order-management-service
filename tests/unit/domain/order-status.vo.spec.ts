import { OrderStatus, OrderStatusVO } from '../../../src/domain/value-objects/order-status.vo';

describe('OrderStatusVO', () => {
  describe('create()', () => {
    it('should create valid status from string', () => {
      const status = OrderStatusVO.create('criado');
      expect(status.toString()).toBe('criado');
    });

    it('should throw for invalid status string', () => {
      expect(() => OrderStatusVO.create('invalido')).toThrow(/Invalid order status/);
    });

    it('should accept all valid statuses', () => {
      Object.values(OrderStatus).forEach((s) => {
        expect(() => OrderStatusVO.create(s)).not.toThrow();
      });
    });
  });

  describe('initial()', () => {
    it('should return CREATED status', () => {
      const status = OrderStatusVO.initial();
      expect(status.getValue()).toBe(OrderStatus.CREATED);
    });
  });

  describe('canTransitionTo()', () => {
    it('CREATED can transition to PROCESSING', () => {
      const from = OrderStatusVO.create(OrderStatus.CREATED);
      const to = OrderStatusVO.create(OrderStatus.PROCESSING);
      expect(from.canTransitionTo(to)).toBe(true);
    });

    it('CREATED cannot transition to SHIPPED', () => {
      const from = OrderStatusVO.create(OrderStatus.CREATED);
      const to = OrderStatusVO.create(OrderStatus.SHIPPED);
      expect(from.canTransitionTo(to)).toBe(false);
    });

    it('DELIVERED cannot transition to anything', () => {
      const from = OrderStatusVO.create(OrderStatus.DELIVERED);
      [OrderStatus.CREATED, OrderStatus.PROCESSING, OrderStatus.SHIPPED].forEach((s) => {
        expect(from.canTransitionTo(OrderStatusVO.create(s))).toBe(false);
      });
    });
  });

  describe('equals()', () => {
    it('should return true for same status', () => {
      const a = OrderStatusVO.create(OrderStatus.CREATED);
      const b = OrderStatusVO.create(OrderStatus.CREATED);
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different statuses', () => {
      const a = OrderStatusVO.create(OrderStatus.CREATED);
      const b = OrderStatusVO.create(OrderStatus.PROCESSING);
      expect(a.equals(b)).toBe(false);
    });
  });
});
