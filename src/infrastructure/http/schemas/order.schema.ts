import { z } from 'zod';
import { OrderStatus } from '../../../domain/value-objects/order-status.vo';

export const orderItemSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  productName: z.string().min(1, 'productName is required'),
  quantity: z.number().int().positive('quantity must be a positive integer'),
  unitPrice: z.number().positive('unitPrice must be a positive number'),
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1, 'customerId is required'),
  customerEmail: z.string().email('customerEmail must be a valid email'),
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(Object.values(OrderStatus) as [string, ...string[]]),
});

export const orderIdParamSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;
