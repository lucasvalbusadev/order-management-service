import { v4 as uuidv4 } from 'uuid';
import { OrderItem, OrderItemProps } from '../value-objects/order-item.vo';
import { OrderStatus, OrderStatusVO } from '../value-objects/order-status.vo';
import { InvalidOrderError, InvalidStatusTransitionError } from '../errors/domain-errors';

export interface OrderProps {
  id?: string;
  customerId: string;
  customerEmail: string;
  items: OrderItemProps[];
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderPrimitives {
  id: string;
  customerId: string;
  customerEmail: string;
  items: OrderItemProps[];
  status: string;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Order {
  readonly id: string;
  readonly customerId: string;
  readonly customerEmail: string;
  private _items: OrderItem[];
  private _status: OrderStatusVO;
  readonly createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: OrderProps) {
    this.id = props.id ?? uuidv4();
    this.customerId = props.customerId;
    this.customerEmail = props.customerEmail;
    this._items = props.items.map((i) => OrderItem.create(i));
    this._status = props.status ? OrderStatusVO.create(props.status) : OrderStatusVO.initial();
    this.createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  static create(props: OrderProps): Order {
    if (!props.customerId || props.customerId.trim() === '') {
      throw new InvalidOrderError('Customer ID is required');
    }
    if (!props.customerEmail || !Order.isValidEmail(props.customerEmail)) {
      throw new InvalidOrderError('Valid customer email is required');
    }
    if (!props.items || props.items.length === 0) {
      throw new InvalidOrderError('Order must have at least one item');
    }
    return new Order(props);
  }

  static reconstitute(props: OrderProps): Order {
    return new Order(props);
  }

  private static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  get status(): string {
    return this._status.toString();
  }

  get items(): OrderItem[] {
    return [...this._items];
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get totalAmount(): number {
    return parseFloat(this._items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));
  }

  updateStatus(newStatus: string): void {
    const nextStatus = OrderStatusVO.create(newStatus);
    if (!this._status.canTransitionTo(nextStatus)) {
      throw new InvalidStatusTransitionError(this._status.toString(), newStatus);
    }
    this._status = nextStatus;
    this._updatedAt = new Date();
  }

  isDelivered(): boolean {
    return this._status.getValue() === OrderStatus.DELIVERED;
  }

  toPrimitives(): OrderPrimitives {
    return {
      id: this.id,
      customerId: this.customerId,
      customerEmail: this.customerEmail,
      items: this._items.map((i) => i.toJSON()),
      status: this._status.toString(),
      totalAmount: this.totalAmount,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
