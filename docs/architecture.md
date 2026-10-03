# BillBox — Architecture Document

## 1. System Overview

BillBox is a NestJS monolith backed by PostgreSQL via Prisma 7. It follows a modular monolith architecture where each domain (auth, bills, inbox, reminders, etc.) is a NestJS module with its own controller, service, and DTOs.

```
┌───────────────────────────────────────────────────────┐
│                     Client (Web/Mobile)                │
└──────────────────────┬────────────────────────────────┘
                       │  HTTP /api/v1/*
┌──────────────────────▼────────────────────────────────┐
│                     NestJS App                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Global Pipes (ValidationPipe)                   │  │
│  │  Global Filters (AllExceptionsFilter)            │  │
│  │  Global Interceptors (TransformInterceptor)      │  │
│  │  API Versioning (URI: /api/v1/)                  │  │
│  │  Swagger (/docs)                                 │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐   │
│  │ AuthModule │  │ BillsModule │  │  (future mods) │   │
│  │  register  │  │  CRUD       │  │  InboxModule   │   │
│  │  login     │  │  confirm    │  │  ReminderMod   │   │
│  │  profile   │  │  pay        │  │  RecurringMod  │   │
│  │  BillBox ID│  │  search     │  │  ...           │   │
│  └─────┬──────┘  └─────┬──────┘  └───────┬────────┘   │
│        └────────┬──────┴─────────────────┘            │
│                 │                                      │
│  ┌──────────────▼──────────────────────────────────┐  │
│  │  DatabaseModule (Global)                         │  │
│  │  PrismaService → PrismaClient + PrismaPg adapter │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  ConfigModule (Global)                           │  │
│  │  configuration.ts + env.validation.ts             │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────┬────────────────────────────────┘
                       │
┌──────────────────────▼────────────────────────────────┐
│                   PostgreSQL                            │
│  users table  │  bills table  │  (future tables)       │
└───────────────────────────────────────────────────────┘
```

## 2. Module Architecture

### Config Module (Global)

- `configuration.ts` — typed config factory returning port, database URL, JWT settings.
- `env.validation.ts` — validates required env vars at startup using class-validator. Fails fast if `DATABASE_URL`, `JWT_SECRET`, or `JWT_EXPIRES_IN` are missing.

### Database Module (Global)

- `PrismaService` extends `PrismaClient` with the `PrismaPg` driver adapter.
- Implements `OnModuleInit` / `OnModuleDestroy` for connection lifecycle.
- Exported globally so all modules can inject `PrismaService` without importing `DatabaseModule`.

### Common Infrastructure

| Directory | Purpose |
|-----------|---------|
| `decorators/` | `@CurrentUser()` — extracts JWT payload from request |
| `guards/` | `JwtAuthGuard` — protects routes requiring authentication |
| `filters/` | `AllExceptionsFilter` — catches all exceptions, returns structured JSON |
| `interceptors/` | `TransformInterceptor` — wraps responses in `{ success, data, timestamp }` |
| `exceptions/` | Domain-specific HTTP exceptions (duplicate account, bill not found, etc.) |
| `types/` | Shared type exports |
| `pipes/` | Reserved for future custom pipes |
| `middleware/` | Reserved for future middleware |

### Auth Module

Handles user registration (BB-001), BillBox ID generation (BB-002), login, and profile retrieval.

- **BillBox ID format**: `BB-XXXX-XXXX-XXXX` (3 segments of 4 alphanumeric chars)
- **JWT**: Signed with `JWT_SECRET`, expires per `JWT_EXPIRES_IN`
- **Password hashing**: bcrypt with salt rounds 10

### Bills Module

Handles bill CRUD, confirmation, payment, search/filter, and data isolation (BB-040).

- **Data isolation**: Every query scopes by `userId` from the JWT. If a user requests a bill they don't own, a 404 is returned (not a 403 — to prevent information leakage about resource existence).
- **Derived states**: `UPCOMING` and `OVERDUE` are computed at query time from `UNPAID` + `dueDate`, not persisted.

## 3. Data Model

### Enums

```prisma
enum BillStatus {
  PENDING    // Bill received, awaiting user confirmation
  UNPAID     // User confirmed, payment needed
  PAID       // Payment completed
}

enum BillCategory {
  INTERNET
  ELECTRICITY
  GAS
  WATER
  MOBILE
  RESTAURANT
  SHOPPING
  SUBSCRIPTION
  RENT
  EDUCATION
  OTHER
}
```

### Users Table

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| email | String | Unique |
| password | String | bcrypt hash |
| billBoxId | String | Unique, format `BB-XXXX-XXXX-XXXX` |
| name | String? | Optional display name |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### Bills Table

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| userId | String | FK → users.id, cascade delete |
| title | String | Bill name |
| amount | Float | Bill amount |
| description | String? | Optional description |
| status | BillStatus | Default PENDING |
| category | BillCategory | Default OTHER |
| dueDate | DateTime? | Payment deadline |
| paidDate | DateTime? | When payment was made |
| paidAmount | Float? | Amount actually paid |
| paymentMethod | String? | bKash, cash, etc. |
| paymentRef | String? | Transaction reference |
| notes | String? | Free-form user notes (BB-038) |
| isRecurring | Boolean | Default false |
| sender | String? | Sender / provider name |
| receivedAt | DateTime? | When bill arrived in inbox |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Indexes: `userId`, `status`, `category`, `dueDate`.

## 4. API Design

- **Versioning**: URI-based (`/api/v1/`), default version `1`.
- **Response format**: All responses wrapped by `TransformInterceptor`:
  ```json
  {
    "success": true,
    "data": { ... },
    "timestamp": "2026-10-03T12:00:00.000Z"
  }
  ```
- **Error format**: All errors handled by `AllExceptionsFilter`:
  ```json
  {
    "statusCode": 404,
    "message": "Bill with ID \"abc\" not found",
    "error": "Not Found",
    "timestamp": "2026-10-03T12:00:00.000Z",
    "path": "/api/v1/bills/abc"
  }
  ```
- **Auth**: JWT Bearer token in `Authorization` header.
- **Validation**: `ValidationPipe` with `whitelist`, `transform`, `forbidNonWhitelisted`.
- **Swagger**: Available at `/docs`.

## 5. Security

- Passwords hashed with bcrypt (salt rounds 10).
- JWT tokens signed with secret from env, never exposed in responses beyond the auth endpoints.
- Account data isolation: bills are scoped to the authenticated user. Accessing another user's bill returns 404 (not 403) to avoid resource enumeration.
- Input validation via class-validator on all DTOs with `forbidNonWhitelisted` to reject unexpected fields.

## 6. Future Architecture Considerations

- **Bill Inbox (Phase 3)**: A separate `InboxModule` for receiving bills via BillBox ID, with a public endpoint for senders.
- **Reminders (Phase 6)**: Likely a `@nestjs/schedule`-based cron job module.
- **Recurring Bills (Phase 7)**: A `RecurringRule` model linked to the parent bill, with a scheduler generating child bills.
- **Documents (Phase 5)**: File storage via S3 or local disk, with a `BillDocument` model.
- **Notifications (Phase 9)**: Event-based system (NestJS EventEmitter) decoupling notification delivery from business logic.
- **Bill History (Phase 4)**: A `BillHistory` model recording each lifecycle transition.
