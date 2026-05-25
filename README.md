# Real-Time Chat App

Production-grade chat application with WebSockets, GraphQL, Redis Pub/Sub, and Kafka event streaming — fully containerized and Kubernetes-ready.

![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-green?logo=node.js&logoColor=white) ![GraphQL](https://img.shields.io/badge/GraphQL-E10098?logo=graphql&logoColor=white) ![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white) ![Kafka](https://img.shields.io/badge/Kafka-231F20?logo=apachekafka&logoColor=white) ![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?logo=kubernetes&logoColor=white) ![License](https://img.shields.io/badge/license-MIT-orange)

---

## Architecture

```
Client
  │
  ├── WebSocket ──→ WS Server ──→ Redis Pub/Sub ──→ broadcast to all clients
  │
  └── GraphQL ───→ Apollo Server ──→ PostgreSQL
                          │
                          └──→ Kafka ──→ async event streaming
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Runtime | Node.js + TypeScript |
| API | GraphQL (Apollo Server v5) + REST |
| Real-time | WebSockets (ws) |
| Cache + Pub/Sub | Redis (ioredis) |
| Message Queue | Apache Kafka (kafkajs) |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| Containers | Docker + Docker Compose |
| Orchestration | Kubernetes |
| Testing | Jest + ts-jest |
| CI/CD | GitHub Actions |

---

## Features

- **Real-time messaging** via WebSocket connections with Redis Pub/Sub fan-out
- **GraphQL API** for rooms, users, and message history
- **Kafka event streaming** for async notifications and decoupled services
- **JWT authentication** with bcrypt password hashing
- **Redis caching** for fast message retrieval
- **Full test coverage** with Jest
- **CI/CD pipeline** via GitHub Actions
- **Kubernetes manifests** for production deployment

---

## Quick Start

**With Docker (recommended):**
```bash
git clone https://github.com/ishal1410/realtime-chat-app.git
cd realtime-chat-app
docker-compose up --build
```

GraphQL Playground → [http://localhost:4000/graphql](http://localhost:4000/graphql)

**Local development:**
```bash
npm install
npm run dev
```

**Run tests:**
```bash
npm test
```

---

## Project Structure

```
src/
├── index.ts              # Entry point — HTTP + WebSocket server
├── graphql/
│   ├── schema.ts         # Type definitions
│   └── resolvers.ts      # Query/Mutation resolvers
├── services/
│   ├── redis.ts          # Redis client + Pub/Sub
│   └── kafka.ts          # Kafka producer/consumer
├── db/
│   └── postgres.ts       # PostgreSQL connection
└── middleware/
    └── auth.ts           # JWT verification
k8s/                      # Kubernetes manifests
.github/workflows/        # CI/CD pipeline
```

---

## License

MIT
