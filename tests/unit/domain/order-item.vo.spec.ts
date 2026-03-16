import { OrderItem } from '../../../src/domain/value-objects/order-item.vo';

describe('OrderItem', () => {
  const valid = { productId: 'p1', productName: 'Tênis', quantity: 2, unitPrice: 150 };

  it('should create a valid item', () => {
    const item = OrderItem.create(valid);
    expect(item.productId).toBe('p1');
    expect(item.productName).toBe('Tênis');
    expect(item.quantity).toBe(2);
    expect(item.unitPrice).toBe(150);
    expect(item.totalPrice).toBe(300);
  });

  it('should calculate totalPrice correctly with decimals', () => {
    const item = OrderItem.create({ ...valid, quantity: 3, unitPrice: 9.99 });
    expect(item.totalPrice).toBe(29.97);
  });

  it('should throw when productId is empty', () => {
    expect(() => OrderItem.create({ ...valid, productId: '' })).toThrow('Product ID is required');
  });

  it('should throw when productName is empty', () => {
    expect(() => OrderItem.create({ ...valid, productName: '' })).toThrow(
      'Product name is required',
    );
  });

  it('should throw when quantity is zero', () => {
    expect(() => OrderItem.create({ ...valid, quantity: 0 })).toThrow(
      'Quantity must be a positive integer',
    );
  });

  it('should throw when quantity is negative', () => {
    expect(() => OrderItem.create({ ...valid, quantity: -1 })).toThrow(
      'Quantity must be a positive integer',
    );
  });

  it('should throw when quantity is a float', () => {
    expect(() => OrderItem.create({ ...valid, quantity: 1.5 })).toThrow(
      'Quantity must be a positive integer',
    );
  });

  it('should throw when unitPrice is zero', () => {
    expect(() => OrderItem.create({ ...valid, unitPrice: 0 })).toThrow(
      'Unit price must be a positive number',
    );
  });

  it('should serialize with toJSON()', () => {
    const item = OrderItem.create(valid);
    const json = item.toJSON();
    expect(json).toEqual(valid);
  });
});
