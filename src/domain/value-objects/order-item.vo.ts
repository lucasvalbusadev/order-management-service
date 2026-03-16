export interface OrderItemProps {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export class OrderItem {
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPrice: number;

  private constructor(props: OrderItemProps) {
    this.productId = props.productId;
    this.productName = props.productName;
    this.quantity = props.quantity;
    this.unitPrice = props.unitPrice;
  }

  static create(props: OrderItemProps): OrderItem {
    if (!props.productId || props.productId.trim() === '') {
      throw new Error('Product ID is required');
    }
    if (!props.productName || props.productName.trim() === '') {
      throw new Error('Product name is required');
    }
    if (!Number.isInteger(props.quantity) || props.quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    if (typeof props.unitPrice !== 'number' || props.unitPrice <= 0) {
      throw new Error('Unit price must be a positive number');
    }
    return new OrderItem(props);
  }

  get totalPrice(): number {
    return parseFloat((this.quantity * this.unitPrice).toFixed(2));
  }

  toJSON(): OrderItemProps {
    return {
      productId: this.productId,
      productName: this.productName,
      quantity: this.quantity,
      unitPrice: this.unitPrice,
    };
  }
}
