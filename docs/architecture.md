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
│  ┌────────────┐  ┌────────────────┐                    │
│  │ AuthModule │  │  (future mods)  │                    │
│  │  register  │  │  BillsModule    │                    │
│  │  login     │  │  InboxModule     │                    │
│  │  profile   │  │  ReminderMod    │                    │
│  │  BillBox ID│  │  ...            │                    │
│  └─────┬──────┘  └───────┬────────┘                    │
│        └────────┬────────┘                              │
│                 │                                       │
│  ┌──────────────▼──────────────────────────────────┐   │
│  │  DatabaseModule (Global)                        │   │
│  │  PrismaService → PrismaClient + PrismaPg adapter│   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ConfigModule (Global)                          │   │
│  │  configuration.ts + env.validation.ts            │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────────┬─────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────┐
│                   PostgreSQL                             │
│  users table  │  (future tables)                         │
└────────────────────────────────────────────────────────┘
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
| `exceptions/` | Domain-specific HTTP exceptions |
| `types/` | Shared type exports |
| `pipes/` | Reserved for future custom pipes |
| `middleware/` | Reserved for future middleware |

### Auth Module

Handles user registration (BB-001), BillBox ID generation (BB-002), login, profile retrieval, and account data isolation (BB-040).

- **BillBox ID format**: `BB-XXXX-XXXX-XXXX` (3 segments of 4 alphanumeric chars)
- **JWT**: Signed with `JWT_SECRET`, expires per `JWT_EXPIRES_IN`
- **Password hashing**: bcrypt with salt rounds 10
- **Data isolation (BB-040)**: User profile queries are scoped to the authenticated user's ID from the JWT payload.

## 3. Data Model

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
    "message": "...",
    "error": "Not Found",
    "timestamp": "2026-10-03T12:00:00.000Z",
    "path": "/api/v1/..."
  }
  ```
- **Auth**: JWT Bearer token in `Authorization` header.
- **Validation**: `ValidationPipe` with `whitelist`, `transform`, `forbidNonWhitelisted`.
- **Swagger**: Available at `/docs`.

## 5. Security

- Passwords hashed with bcrypt (salt rounds 10).
- JWT tokens signed with secret from env, never exposed in responses beyond the auth endpoints.
- Account data isolation (BB-040): user data is scoped to the authenticated user.
- Input validation via class-validator on all DTOs with `forbidNonWhitelisted` to reject unexpected fields.

## 6. Future Architecture Considerations

- **Bill Core (Phase 2)**: A `BillsModule` for bill CRUD, confirmation, payment records.
- **Bill Inbox (Phase 3)**: A separate `InboxModule` for receiving bills via BillBox ID, with a public endpoint for senders.
- **Reminders (Phase 6)**: Likely a `@nestjs/schedule`-based cron job module.
- **Recurring Bills (Phase 7)**: A `RecurringRule` model linked to the parent bill, with a scheduler generating child bills.
- **Documents (Phase 5)**: File storage via S3 or local disk, with a `BillDocument` model.
- **Notifications (Phase 9)**: Event-based system (NestJS EventEmitter) decoupling notification delivery from business logic.
- **Bill History (Phase 4)**: A `BillHistory` model recording each lifecycle transition.
