import { Kafka, Producer } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'chat-app',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

let producer: Producer;

export async function connectKafka() {
  try {
    producer = kafka.producer();
    await producer.connect();
    console.log('Kafka producer connected');

    const consumer = kafka.consumer({ groupId: 'chat-group' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'messages', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        const data = JSON.parse(message.value?.toString() || '{}');
        console.log('Kafka message received:', data);
      },
    });
    console.log('Kafka consumer connected');
  } catch (err) {
    console.error('Kafka connection error:', err);
  }
}

export async function publishMessage(data: object) {
  try {
    await producer.send({
      topic: 'messages',
      messages: [{ value: JSON.stringify(data) }],
    });
  } catch (err) {
    console.error('Kafka publish error:', err);
  }
}