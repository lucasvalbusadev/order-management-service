export interface OrderStatusChangedEvent {
  orderId: string;
  customerId: string;
  customerEmail: string;
  previousStatus: string;
  newStatus: string;
  totalAmount: number;
  changedAt: Date;
}

export interface IMessageBroker {
  publish(exchange: string, routingKey: string, message: unknown): Promise<void>;
  close(): Promise<void>;
}
