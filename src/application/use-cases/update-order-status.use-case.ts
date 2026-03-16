import { OrderNotFoundError } from '../../domain/errors/domain-errors';
import { IOrderRepository } from '../ports/order-repository.port';
import { IMessageBroker, OrderStatusChangedEvent } from '../ports/message-broker.port';
import { ILogger } from '../ports/logger.port';
import { CreateOrderOutput } from './create-order.use-case';

export const ORDER_EXCHANGE = 'orders';
export const ORDER_STATUS_CHANGED_ROUTING_KEY = 'order.status.changed';

export interface UpdateOrderStatusInput {
  orderId: string;
  newStatus: string;
}

export class UpdateOrderStatusUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly messageBroker: IMessageBroker,
    private readonly logger: ILogger,
  ) {}

  async execute(input: UpdateOrderStatusInput): Promise<CreateOrderOutput> {
    this.logger.info('Updating order status', {
      orderId: input.orderId,
      newStatus: input.newStatus,
    });

    const order = await this.orderRepository.findById(input.orderId);

    if (!order) {
      this.logger.warn('Order not found for status update', { orderId: input.orderId });
      throw new OrderNotFoundError(input.orderId);
    }

    const previousStatus = order.status;
    order.updateStatus(input.newStatus);

    const updated = await this.orderRepository.update(order);

    const event: OrderStatusChangedEvent = {
      orderId: updated.id,
      customerId: updated.customerId,
      customerEmail: updated.customerEmail,
      previousStatus,
      newStatus: updated.status,
      totalAmount: updated.totalAmount,
      changedAt: updated.updatedAt,
    };

    try {
      await this.messageBroker.publish(ORDER_EXCHANGE, ORDER_STATUS_CHANGED_ROUTING_KEY, event);
      this.logger.info('Status change event published', {
        orderId: updated.id,
        previousStatus,
        newStatus: updated.status,
      });
    } catch (err) {
      this.logger.error('Failed to publish status change event', {
        orderId: updated.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return updated.toPrimitives();
  }
}
