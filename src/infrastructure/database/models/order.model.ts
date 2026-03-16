import mongoose, { Document, Schema } from 'mongoose';
import { OrderStatus } from '../../../domain/value-objects/order-status.vo';

export interface OrderItemDocument {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderDocument extends Document<string> {
  _id: string;
  customerId: string;
  customerEmail: string;
  items: OrderItemDocument[];
  status: OrderStatus;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<OrderItemDocument>(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderDocument>(
  {
    _id: { type: String, required: true },
    customerId: { type: String, required: true, index: true },
    customerEmail: { type: String, required: true },
    items: { type: [orderItemSchema], required: true },
    status: {
      type: String,
      required: true,
      enum: Object.values(OrderStatus),
      default: OrderStatus.CREATED,
      index: true,
    },
    totalAmount: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ customerId: 1, status: 1 });

export const OrderModel = mongoose.model<OrderDocument>('Order', orderSchema);
