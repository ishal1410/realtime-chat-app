# Real-Time Chat Application

A production-grade real-time chat application built with modern backend technologies including GraphQL, WebSockets, Redis, Kafka, Docker, and Kubernetes.

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **API**: GraphQL (Apollo Server v5) + REST
- **Real-time**: WebSockets (ws)
- **Cache**: Redis (ioredis) with Pub/Sub
- **Message Queue**: Apache Kafka (kafkajs)
- **Database**: PostgreSQL
- **Auth**: JWT + bcrypt
- **DevOps**: Docker, Docker Compose, Kubernetes
- **Testing**: Jest + ts-jest
- **CI/CD**: GitHub Actions

## Architecture

```
Client <──> WebSocket Server   (real-time messaging)
Client <──> GraphQL API        (queries & mutations)
GraphQL ──> PostgreSQL         (persistent storage)
GraphQL ──> Redis              (caching & pub/sub)
GraphQL ──> Kafka              (async event streaming)
```

## Features

- Real-time messaging via WebSockets
- GraphQL API for rooms, users, messages
- Redis caching for fast message retrieval
- Kafka for async event-driven notification delivery
- JWT-based authentication with bcrypt password hashing
- Dockerized for easy local and cloud deployment
- Kubernetes-ready configuration

## Getting Started

### With Docker Compose
```bash
docker-compose up --build
```

### Local Development
```bash
npm install
npm run dev
```

### Build
```bash
npm run build
```

### Run Tests
```bash
npm test
```

## API

GraphQL playground available at: `http://localhost:4000/graphql`

### Example Mutations

```graphql
mutation Register {
  register(username: "vishal", email: "v@test.com", password: "pass123") {
    token
    user { id username email }
  }
}

mutation Login {
  login(email: "v@test.com", password: "pass123") {
    token
    user { id username }
  }
}

mutation SendMessage {
  sendMessage(roomId: "1", content: "Hello World!") {
    id content createdAt
  }
}
```

### Example Queries

```graphql
query GetRooms {
  rooms {
    id name
  }
}

query GetMessages {
  messages(roomId: "1") {
    id content
    sender { username }
  }
}
```

## Project Structure

```
src/
├── index.ts              # Entry point
├── graphql/
│   ├── schema.ts         # GraphQL type definitions
│   └── resolvers.ts      # GraphQL resolvers
├── services/
│   ├── redis.ts          # Redis client & connection
│   └── kafka.ts          # Kafka producer & consumer
├── db/
│   └── postgres.ts       # PostgreSQL pool & migrations
└── middleware/
    └── auth.ts           # JWT authentication middleware
```

## Environment Variables

```env
PORT=4000
JWT_SECRET=your_secret
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chatapp
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
KAFKA_BROKER=localhost:9092
```