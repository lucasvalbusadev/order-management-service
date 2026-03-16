import { Order } from '../../../domain/entities/order.entity';
import { IOrderRepository } from '../../../application/ports/order-repository.port';
import { OrderModel, OrderDocument } from '../models/order.model';

export class MongoOrderRepository implements IOrderRepository {
  private toDomain(doc: OrderDocument): Order {
    return Order.reconstitute({
      id: doc._id,
      customerId: doc.customerId,
      customerEmail: doc.customerEmail,
      items: doc.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async save(order: Order): Promise<Order> {
    const primitives = order.toPrimitives();
    const doc = await OrderModel.create({
      _id: primitives.id,
      customerId: primitives.customerId,
      customerEmail: primitives.customerEmail,
      items: primitives.items,
      status: primitives.status,
      totalAmount: primitives.totalAmount,
    });
    return this.toDomain(doc);
  }

  async findById(id: string): Promise<Order | null> {
    const doc = await OrderModel.findById(id).lean<OrderDocument>().exec();
    if (!doc) return null;
    return this.toDomain(doc as OrderDocument);
  }

  async update(order: Order): Promise<Order> {
    const primitives = order.toPrimitives();
    const doc = await OrderModel.findByIdAndUpdate(
      primitives.id,
      {
        status: primitives.status,
        totalAmount: primitives.totalAmount,
        updatedAt: primitives.updatedAt,
      },
      { new: true },
    ).exec();

    if (!doc) {
      throw new Error(`Order ${primitives.id} not found during update`);
    }

    return this.toDomain(doc);
  }
}
