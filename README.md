# 📦 Order Service

Serviço de gerenciamento de pedidos para e-commerce, construído com **Node.js + Fastify**, **MongoDB** e **RabbitMQ**, seguindo os princípios de **Arquitetura Hexagonal (Ports & Adapters)** e **Clean Architecture**.

---

## 🚀 Stack Utilizada

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 (LTS) |
| Framework HTTP | Fastify 4 |
| Banco de Dados | MongoDB 7 + Mongoose 8 |
| Mensageria | RabbitMQ 3.13 + amqplib |
| Linguagem | TypeScript 5 |
| Validação | Zod |
| Logging | Pino |
| Documentação API | Swagger / OpenAPI 3 (`@fastify/swagger`) |
| Testes | Jest + ts-jest + mongodb-memory-server |
| Lint / Format | ESLint + Prettier |
| Containerização | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## 🏛️ Arquitetura

O projeto segue **Arquitetura Hexagonal (Ports & Adapters)**:

```
src/
├── domain/                      ← Núcleo de negócio (sem dependências externas)
│   ├── entities/
│   │   └── order.entity.ts      ← Entidade Order com regras de negócio
│   ├── value-objects/
│   │   ├── order-status.vo.ts   ← Status com máquina de estados e transições válidas
│   │   └── order-item.vo.ts     ← Item de pedido com validação de invariantes
│   └── errors/
│       └── domain-errors.ts     ← Erros de domínio tipados
│
├── application/                 ← Casos de uso e ports (interfaces)
│   ├── use-cases/
│   │   ├── create-order.use-case.ts
│   │   ├── get-order.use-case.ts
│   │   └── update-order-status.use-case.ts
│   └── ports/
│       ├── order-repository.port.ts   ← Interface do repositório
│       ├── message-broker.port.ts     ← Interface do broker
│       └── logger.port.ts             ← Interface do logger
│
└── infrastructure/              ← Adapters (implementações concretas)
    ├── database/
    │   ├── models/order.model.ts
    │   ├── repositories/mongo-order.repository.ts
    │   └── mongo.connection.ts
    ├── messaging/
    │   └── rabbitmq.broker.ts
    ├── logger/
    │   └── pino.logger.ts
    ├── config/
    │   └── app.config.ts
    └── http/
        ├── app.ts                      ← Factory do Fastify
        ├── server.ts                   ← Entrypoint + DI manual
        ├── routes/
        │   ├── order.routes.ts
        │   └── health.routes.ts
        ├── schemas/
        │   └── order.schema.ts         ← Validação Zod
        └── middlewares/
            └── error-handler.middleware.ts
```

### Fluxo de dependências

```
HTTP Request
    │
    ▼
order.routes.ts          ← Adapter HTTP (infra)
    │
    ▼
Use Case                 ← Application (orquestração)
    │             │
    ▼             ▼
Repository      Broker    ← Ports (interfaces)
    │             │
    ▼             ▼
MongoDB      RabbitMQ     ← Adapters concretos (infra)
```

A camada de domínio **não importa nada** de infraestrutura — totalmente isolada e testável.

---

## ⚡ Execução com Docker

### Pré-requisitos
- Docker ≥ 24
- Docker Compose ≥ 2.20

### Subir todos os serviços

```bash
# 1. Clone o repositório
git clone <repo-url>
cd order-service

# 2. Suba os containers (MongoDB + RabbitMQ + App)
docker-compose up --build

# 3. Acesse
#   API:          http://localhost:3000
#   Swagger UI:   http://localhost:3000/docs
#   RabbitMQ UI:  http://localhost:15672  (guest / guest)
```

### Parar os serviços

```bash
docker-compose down
# Para remover volumes (limpar dados):
docker-compose down -v
```

---

## 🛠️ Execução Local (sem Docker)

### Pré-requisitos
- Node.js 20+
- MongoDB rodando localmente
- RabbitMQ rodando localmente

```bash
# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações locais

# Modo desenvolvimento (hot-reload)
npm run dev

# Build de produção
npm run build
npm start
```

---

## 🔌 Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Healthcheck do serviço |
| `POST` | `/orders` | Criação de novo pedido |
| `GET` | `/orders/:id` | Consulta pedido por ID |
| `PATCH` | `/orders/:id/status` | Atualização de status |

Documentação interativa completa disponível em **`/docs`** (Swagger UI).

### Exemplos de requisição

#### POST /orders

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "customerEmail": "cliente@email.com",
    "items": [
      {
        "productId": "prod-001",
        "productName": "Tênis Running X",
        "quantity": 2,
        "unitPrice": 299.99
      }
    ]
  }'
```

#### PATCH /orders/:id/status

```bash
curl -X PATCH http://localhost:3000/orders/<id>/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "em_processamento" }'
```

### Status de pedido e transições válidas

```
criado → em_processamento → enviado → entregue
```

Qualquer transição fora desta sequência retorna **HTTP 422**.

---

## 🧪 Testes

```bash
# Todos os testes
npm test

# Apenas testes unitários
npm run test:unit

# Apenas testes de integração
npm run test:integration

# Com relatório de cobertura
npm run test:coverage
```

### Cobertura de testes

| Camada | Cobertura |
|---|---|
| Domain (entities + VOs) | ≥ 95% |
| Application (use cases) | ≥ 95% |
| Infrastructure (repos + broker) | ≥ 90% |
| HTTP (routes via integração) | ≥ 90% |
| **Global** | **≥ 90%** |

Os testes de integração usam **`mongodb-memory-server`** — nenhum serviço externo é necessário para rodá-los.

---

## 📨 Integração com RabbitMQ

Ao atualizar o status de um pedido, o serviço publica automaticamente um evento no exchange `orders` com routing key `order.status.changed`:

```json
{
  "orderId": "uuid",
  "customerId": "cust-123",
  "customerEmail": "cliente@email.com",
  "previousStatus": "criado",
  "newStatus": "em_processamento",
  "totalAmount": 599.98,
  "changedAt": "2026-03-15T12:00:00.000Z"
}
```

- Exchange: `orders` (topic, durable)
- Routing key: `order.status.changed`
- Mensagens: persistentes, `application/json`
- Falha no broker é **não-bloqueante**: o pedido é atualizado e o erro é logado.

---

## 🔑 Variáveis de Ambiente

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `PORT` | Não | `3000` | Porta da aplicação |
| `NODE_ENV` | Não | `development` | Ambiente |
| `MONGO_URI` | **Sim** | — | URI do MongoDB |
| `RABBITMQ_URL` | **Sim** | — | URL do RabbitMQ |
| `LOG_LEVEL` | Não | `info` | Nível de log (pino) |
| `SERVICE_NAME` | Não | `order-service` | Nome no healthcheck |

---

## 🏗️ CI/CD — GitHub Actions

O pipeline (`.github/workflows/ci.yml`) executa automaticamente em `push` e `pull_request`:

| Job | Trigger | Descrição |
|---|---|---|
| `lint` | Sempre | ESLint em todo o código TypeScript |
| `test-unit` | Sempre | Testes unitários + cobertura |
| `test-integration` | Sempre | Testes de integração (in-memory) |
| `coverage` | Após testes | Verifica gate de 90% de cobertura |
| `build` | Após testes passarem | Build da imagem Docker |
| `publish` | Push em `main` | Publica imagem no GHCR |

---

## 🧩 Principais Decisões Técnicas

### Arquitetura Hexagonal
O domínio é completamente isolado de frameworks e infraestrutura. Use cases dependem apenas de interfaces (ports), tornando a troca de MongoDB por outro banco, ou RabbitMQ por outro broker, transparente para o negócio.

### Máquina de estados no domínio
As transições de status (`criado → em_processamento → enviado → entregue`) são validadas dentro de `OrderStatusVO`, garantindo que regras de negócio nunca escapem para a camada de infraestrutura.

### Injeção de dependências manual
Sem frameworks de IoC (InversifyJS, tsyringe). A composição acontece em `server.ts`, mantendo simplicidade e legibilidade total do grafo de dependências.

### Falha não-bloqueante no broker
A atualização de status persiste no MongoDB mesmo que o RabbitMQ esteja indisponível. O erro é logado como `error` para monitoramento, mas não reverte a transação — decisão de resiliência adequada para um serviço de pedidos.

### UUID como `_id` no MongoDB
Pedidos usam UUID v4 como `_id` em vez do ObjectId padrão do MongoDB, facilitando a rastreabilidade entre serviços sem depender de conversão de tipos.

### Testes de integração in-memory
`mongodb-memory-server` sobe um MongoDB real em memória — os testes de integração validam o comportamento completo (HTTP → Use Case → Repository → MongoDB) sem nenhuma dependência de infraestrutura externa no CI.

---

## 📄 Licença

MIT
