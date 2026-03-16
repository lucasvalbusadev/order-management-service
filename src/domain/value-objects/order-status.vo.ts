export enum OrderStatus {
  CREATED = 'criado',
  PROCESSING = 'em_processamento',
  SHIPPED = 'enviado',
  DELIVERED = 'entregue',
}

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREATED]: [OrderStatus.PROCESSING],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
};

export class OrderStatusVO {
  private constructor(private readonly value: OrderStatus) {}

  static create(status: string): OrderStatusVO {
    const validStatuses = Object.values(OrderStatus) as string[];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid order status: ${status}. Valid values: ${validStatuses.join(', ')}`);
    }
    return new OrderStatusVO(status as OrderStatus);
  }

  static initial(): OrderStatusVO {
    return new OrderStatusVO(OrderStatus.CREATED);
  }

  canTransitionTo(next: OrderStatusVO): boolean {
    return VALID_TRANSITIONS[this.value].includes(next.value);
  }

  equals(other: OrderStatusVO): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  getValue(): OrderStatus {
    return this.value;
  }
}
