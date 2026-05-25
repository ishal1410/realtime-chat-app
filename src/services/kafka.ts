import { Kafka, Producer, Consumer } from 'kafkajs';
import { logger } from '../logger';

const kafka = new Kafka({
  clientId: 'chat-app',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

let producer: Producer;
let consumer: Consumer;

export async function connectKafka(): Promise<void> {
  try {
    producer = kafka.producer();
    await producer.connect();
    logger.info('Kafka producer connected');

    consumer = kafka.consumer({ groupId: 'chat-group' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'messages', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value?.toString() ?? '{}') as unknown;
          logger.info({ topic, partition }, 'Kafka message consumed');
          // Downstream event handlers go here (e.g. push notifications, analytics)
          void data;
        } catch (err) {
          logger.error({ err }, 'Failed to process Kafka message');
        }
      },
    });

    logger.info('Kafka consumer connected and listening');
  } catch (err) {
    // Kafka is non-critical for the MVP — log and continue rather than crash
    logger.warn({ err }, 'Kafka connection failed — real-time fan-out via Redis only');
  }
}

export async function publishMessage(data: object): Promise<void> {
  if (!producer) {
    logger.warn('Kafka producer not initialised — skipping publish');
    return;
  }
  try {
    await producer.send({
      topic: 'messages',
      messages: [{ value: JSON.stringify(data) }],
    });
  } catch (err) {
    // Log but don't throw — the message was already saved to DB and broadcast via WS/Redis
    logger.error({ err }, 'Kafka publish failed');
  }
}

export async function disconnectKafka(): Promise<void> {
  try {
    await consumer?.disconnect();
    await producer?.disconnect();
    logger.info('Kafka disconnected');
  } catch (err) {
    logger.error({ err }, 'Error disconnecting Kafka');
  }
}
