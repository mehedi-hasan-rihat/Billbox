# Billers API

Base path: `/api/v1/billers`

All endpoints require authentication: `Authorization: Bearer <token>`

A **biller** is a sender or provider in your personal list — the entity that issues bills to you (e.g. Grameenphone, DESCO, your landlord, a restaurant). Billers are private per user.

A biller can be:
- A **BillBox user** — identified by their `billBoxId`, enabling direct inbox sending in the future
- An **external party** — stored with name, phone, email, and/or address only

---

## Endpoints

### GET /billers/lookup?billBoxId=

Look up a BillBox user by their BillBox ID before creating a biller. Returns their public profile so you can pre-fill the biller form.

**Query Parameters**

| Param | Type | Required |
|-------|------|----------|
| billBoxId | string | Yes |

**Example Request**

```bash
curl "http://localhost:3000/api/v1/billers/lookup?billBoxId=BB-A1B2-C3D4-E5F6" \
  -H "Authorization: Bearer <token>"
```

**Example Response (200)**

```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "billBoxId": "BB-A1B2-C3D4-E5F6",
    "name": "Rakib",
    "email": "rakib@example.com"
  },
  "timestamp": "2026-10-05T08:00:00.000Z"
}
```

**Errors**

| Status | Message |
|--------|---------|
| 400 | `billBoxId` is required |
| 404 | No BillBox account found with ID "..." |

---

### POST /billers

Create a new biller.

**Request Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | Yes | Display name |
| phone | string | No | |
| email | string | No | Valid email |
| address | string | No | |
| billBoxId | string | No | If this biller is a BillBox user |

**Example — BillBox user as biller**

```bash
curl -X POST http://localhost:3000/api/v1/billers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rakib",
    "billBoxId": "BB-A1B2-C3D4-E5F6"
  }'
```

**Example — External biller**

```bash
curl -X POST http://localhost:3000/api/v1/billers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Grameenphone",
    "phone": "01700000000",
    "email": "billing@gp.com.bd"
  }'
```

**Example Response (201)**

```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "userId": "clx...",
    "name": "Grameenphone",
    "phone": "01700000000",
    "email": "billing@gp.com.bd",
    "address": null,
    "billBoxId": null,
    "createdAt": "2026-10-05T08:00:00.000Z",
    "updatedAt": "2026-10-05T08:00:00.000Z"
  },
  "timestamp": "2026-10-05T08:00:00.000Z"
}
```

**Errors**

| Status | Message |
|--------|---------|
| 400 | No BillBox account found with ID "..." |
| 400 | Validation errors |

---

### GET /billers

List all billers belonging to the authenticated user, sorted by name.

**Example Request**

```bash
curl http://localhost:3000/api/v1/billers \
  -H "Authorization: Bearer <token>"
```

---

### GET /billers/:id

Get a single biller by ID.

**Errors**

| Status | Message |
|--------|---------|
| 404 | Biller not found |

---

### PATCH /billers/:id

Update a biller. All fields are optional.

**Request Body**

| Field | Type |
|-------|------|
| name | string |
| phone | string |
| email | string |
| address | string |
| billBoxId | string |

**Errors**

| Status | Message |
|--------|---------|
| 400 | No BillBox account found with ID "..." |
| 404 | Biller not found |

---

### DELETE /billers/:id

Delete a biller. Existing bills linked to this biller retain the `senderBillerId` reference in the database — the biller record is soft-removed from your list only.

**Example Response (200)**

```json
{
  "success": true,
  "data": { "deleted": true },
  "timestamp": "2026-10-05T08:00:00.000Z"
}
```

**Errors**

| Status | Message |
|--------|---------|
| 404 | Biller not found |

---

## Using a Biller when creating a bill

When creating a bill via `POST /bills`, pass the biller's ID as `senderBillerId`:

```json
{
  "name": "October Internet Bill",
  "category": "INTERNET",
  "amount": "1200.00",
  "dueDate": "2026-10-10",
  "senderBillerId": "clx..."
}
```

The bill response will include the full `senderBiller` object.
