# Auth API

Base path: `/api/v1/auth`

## Endpoints

### POST /auth/register

Register a new BillBox account. Generates a unique BillBox ID automatically.

**Request Body**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| email | string | Yes | Valid email |
| password | string | Yes | Min 8 characters |
| name | string | No | Display name |

**Example Request**

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mehedi@example.com",
    "password": "securepassword123",
    "name": "Mehedi"
  }'
```

**Example Response (201)**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGci...",
    "user": {
      "id": "clx...",
      "email": "mehedi@example.com",
      "name": "Mehedi",
      "billBoxId": "BB-A1B2-C3D4-E5F6"
    }
  },
  "timestamp": "2026-10-03T12:00:00.000Z"
}
```

**Error Responses**

| Status | Message |
|--------|---------|
| 409 | An account with email "..." already exists |
| 400 | Validation errors (invalid email, password too short) |

**Tickets covered**: BB-001 (User Registration), BB-002 (Personal BillBox ID)

---

### POST /auth/login

Login to an existing account and receive a JWT token.

**Request Body**

| Field | Type | Required |
|-------|------|----------|
| email | string | Yes |
| password | string | Yes |

**Example Request**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mehedi@example.com",
    "password": "securepassword123"
  }'
```

**Example Response (200)**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGci...",
    "user": {
      "id": "clx...",
      "email": "mehedi@example.com",
      "name": "Mehedi",
      "billBoxId": "BB-A1B2-C3D4-E5F6"
    }
  },
  "timestamp": "2026-10-03T12:00:00.000Z"
}
```

**Error Responses**

| Status | Message |
|--------|---------|
| 401 | Invalid email or password |

---

### GET /auth/me

Get the current user's profile. Requires authentication.

**Headers**

```
Authorization: Bearer <token>
```

**Example Request**

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGci..."
```

**Example Response (200)**

```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "email": "mehedi@example.com",
    "name": "Mehedi",
    "billBoxId": "BB-A1B2-C3D4-E5F6"
  },
  "timestamp": "2026-10-03T12:00:00.000Z"
}
```

**Tickets covered**: BB-003 (BillBox ID Copy — ID is visible in profile response), BB-040 (Account Data Isolation — user can only see their own profile)

## BillBox ID Format

BillBox IDs follow the pattern `BB-XXXX-XXXX-XXXX` where each segment is 4 uppercase alphanumeric characters. They are generated at registration time and stored as a unique constraint in the database.

## JWT Token

The JWT payload contains:

```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "billBoxId": "BB-XXXX-XXXX-XXXX"
}
```

Tokens are signed with `JWT_SECRET` and expire after `JWT_EXPIRES_IN` (default: 24h).
