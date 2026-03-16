import { Order } from '../../domain/entities/order.entity';
import { OrderItemProps } from '../../domain/value-objects/order-item.vo';
import { IOrderRepository } from '../ports/order-repository.port';
import { ILogger } from '../ports/logger.port';

export interface CreateOrderInput {
  customerId: string;
  customerEmail: string;
  items: OrderItemProps[];
}

export interface CreateOrderOutput {
  id: string;
  customerId: string;
  customerEmail: string;
  items: OrderItemProps[];
  status: string;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    this.logger.info('Creating new order', { customerId: input.customerId });

    const order = Order.create({
      customerId: input.customerId,
      customerEmail: input.customerEmail,
      items: input.items,
    });

    const saved = await this.orderRepository.save(order);

    this.logger.info('Order created successfully', {
      orderId: saved.id,
      customerId: saved.customerId,
      totalAmount: saved.totalAmount,
    });

    return saved.toPrimitives();
  }
}
