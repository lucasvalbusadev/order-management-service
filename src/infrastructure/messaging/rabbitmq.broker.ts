import amqplib, { Channel } from 'amqplib';
import { IMessageBroker } from '../../application/ports/message-broker.port';
import { ILogger } from '../../application/ports/logger.port';

export class RabbitMQBroker implements IMessageBroker {
  private connection: Awaited<ReturnType<typeof amqplib.connect>> | null = null;
  private channel: Channel | null = null;
  private readonly url: string;

  constructor(
    url: string,
    private readonly logger: ILogger,
  ) {
    this.url = url;
  }

  async connect(): Promise<void> {
    try {
      this.connection = await amqplib.connect(this.url);
      this.channel = await this.connection.createChannel();

      this.connection.on('error', (err) => {
        this.logger.error('RabbitMQ connection error', { error: err.message });
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
      });

      this.logger.info('RabbitMQ connected successfully');
    } catch (err) {
      this.logger.error('Failed to connect to RabbitMQ', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async publish(exchange: string, routingKey: string, message: unknown): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized. Call connect() first.');
    }

    await this.channel.assertExchange(exchange, 'topic', { durable: true });

    const content = Buffer.from(JSON.stringify(message));
    const published = this.channel.publish(exchange, routingKey, content, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now(),
    });

    if (!published) {
      throw new Error('Failed to publish message to RabbitMQ');
    }

    this.logger.debug('Message published', { exchange, routingKey });
  }

  async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.info('RabbitMQ connection closed gracefully');
    } catch (err) {
      this.logger.error('Error closing RabbitMQ connection', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }
}
