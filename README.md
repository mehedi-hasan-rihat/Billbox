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

See [docs/PRD.md](docs/PRD.md) for the full product spec and [docs/architecture.md](docs/architecture.md) for the system design.
