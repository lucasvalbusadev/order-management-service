import { OrderNotFoundError } from '../../domain/errors/domain-errors';
import { IOrderRepository } from '../ports/order-repository.port';
import { ILogger } from '../ports/logger.port';
import { CreateOrderOutput } from './create-order.use-case';

export class GetOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(orderId: string): Promise<CreateOrderOutput> {
    this.logger.debug('Fetching order', { orderId });

    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      this.logger.warn('Order not found', { orderId });
      throw new OrderNotFoundError(orderId);
    }

    return order.toPrimitives();
  }
}
