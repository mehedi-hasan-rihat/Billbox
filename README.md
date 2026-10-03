# BillBox

A personal bill inbox and management platform. BillBox lets users receive, organise, track, and store bills in one place — with due-date reminders, recurring bill generation, payment records, and document storage.

## Overview

BillBox solves the problem of scattered bills — email attachments, phone galleries, paper receipts, chat messages. It provides a single personal bill inbox where users can receive bills via a personal BillBox ID and manage them.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 12 (ESM) |
| Database | PostgreSQL via Prisma 7 |
| Auth | JWT + Passport |
| Validation | class-validator + class-transformer |
| API Docs | Swagger / OpenAPI |
| Testing | Vitest |
| Linting | oxlint + Prettier |
| Observability | @nestjs/observe |

## Project Structure

```
billbox/
├── docs/                     # Product & architecture documentation
│   ├── PRD.md                # Product Requirements Document
│   ├── architecture.md       # System architecture
│   └── api/                  # Per-module API docs
│       └── auth.md
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Generated migrations
├── src/
│   ├── config/               # Configuration & env validation
│   │   ├── configuration.ts
│   │   └── env.validation.ts
│   ├── database/             # Prisma service & module
│   │   ├── database.module.ts
│   │   └── prisma.service.ts
│   ├── common/               # Shared infrastructure
│   │   ├── decorators/       # @CurrentUser, etc.
│   │   ├── filters/          # Global exception filter
│   │   ├── guards/           # JwtAuthGuard
│   │   ├── interceptors/     # Response transform
│   │   ├── exceptions/       # Domain exceptions
│   │   ├── middleware/       # (reserved)
│   │   ├── pipes/            # (reserved)
│   │   └── types/            # Shared types
│   ├── generated/            # Prisma generated client (gitignored)
│   └── modules/              # Feature modules
│       └── auth/             # Registration, login, profile, BillBox ID
│           ├── dto/
│           ├── strategies/
│           ├── auth.controller.ts
│           ├── auth.service.ts
│           └── auth.module.ts
└── .env                      # Environment configuration
```

## Getting Started

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_SECRET` | Secret for signing JWT tokens | — |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `24h`) | `24h` |
| `PORT` | Server port | `3000` |

## API Documentation

Swagger UI is available at `http://localhost:3000/docs` when the server is running.

Base URL: `http://localhost:3000/api/v1/`

See [Auth API](docs/api/auth.md) for endpoint details.

## Implementation Phases

| Phase | Capability | Tickets | Status |
|-------|-----------|---------|--------|
| 1 | Identity Foundation | BB-001, BB-002, BB-003, BB-040 | ✅ Done |
| 2 | Bill Core | BB-008–010, BB-011–013, BB-037–038 | ⬜ Pending |
| 3 | Bill Inbox | BB-004–007 | ⬜ Pending |
| 4 | Bill Lifecycle | BB-014–016 | ⬜ Pending |
| 5 | Documents | BB-026–028 | ⬜ Pending |
| 6 | Reminders | BB-017–021 | ⬜ Pending |
| 7 | Recurring Bills | BB-022–025 | ⬜ Pending |
| 8 | Search & History | BB-029–033 | ⬜ Pending |
| 9 | Notifications | BB-034–036 | ⬜ Pending |
| 10 | Duplicate Detection | BB-039 | ⬜ Pending |

See [docs/PRD.md](docs/PRD.md) for the full product spec and [docs/architecture.md](docs/architecture.md) for the system design.
