import { RabbitMQBroker } from '../../../src/infrastructure/messaging/rabbitmq.broker';
import { ILogger } from '../../../src/application/ports/logger.port';
import amqplib from 'amqplib';

jest.mock('amqplib');
const mockAmqp = amqplib as jest.Mocked<typeof amqplib>;

const mockLogger: jest.Mocked<ILogger> = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('RabbitMQBroker', () => {
  let broker: RabbitMQBroker;

  const mockChannel = {
    assertExchange: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockReturnValue(true),
    close: jest.fn().mockResolvedValue(undefined),
  };

  const mockConnection = {
    createChannel: jest.fn().mockResolvedValue(mockChannel),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    broker = new RabbitMQBroker('amqp://localhost', mockLogger);
    (mockAmqp.connect as jest.Mock).mockResolvedValue(mockConnection);
  });

  describe('connect()', () => {
    it('should connect and create a channel', async () => {
      await broker.connect();

      expect(mockAmqp.connect).toHaveBeenCalledWith('amqp://localhost');
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('RabbitMQ connected successfully');
      expect(broker.isConnected()).toBe(true);
    });

    it('should throw and log on connection failure', async () => {
      (mockAmqp.connect as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      await expect(broker.connect()).rejects.toThrow('Connection refused');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('publish()', () => {
    it('should assert exchange and publish message', async () => {
      await broker.connect();
      await broker.publish('orders', 'order.status.changed', { orderId: '1' });

      expect(mockChannel.assertExchange).toHaveBeenCalledWith('orders', 'topic', {
        durable: true,
      });
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'orders',
        'order.status.changed',
        expect.any(Buffer),
        expect.objectContaining({ persistent: true, contentType: 'application/json' }),
      );
    });

    it('should throw if channel not initialized', async () => {
      await expect(broker.publish('exchange', 'key', { data: 'x' })).rejects.toThrow(
        'RabbitMQ channel not initialized',
      );
    });

    it('should throw if publish returns false', async () => {
      mockChannel.publish.mockReturnValue(false);
      await broker.connect();

      await expect(broker.publish('e', 'k', {})).rejects.toThrow('Failed to publish');
    });
  });

  describe('close()', () => {
    it('should close channel and connection gracefully', async () => {
      await broker.connect();
      await broker.close();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('RabbitMQ connection closed gracefully');
    });
  });
});
