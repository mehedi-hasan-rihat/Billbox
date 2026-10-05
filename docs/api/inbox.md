# Inbox API

Base path: `/api/v1/inbox`

All endpoints require authentication: `Authorization: Bearer <token>`

The inbox holds bills that arrived via BillBox ID. A bill stays in the inbox (`status = INBOX`) until the recipient confirms it.

---

## Endpoints

### POST /inbox/send

Send a bill to another user's BillBox ID. The bill lands in their inbox with `status = INBOX`.

**Request Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| recipientBillBoxId | string | Yes | The recipient's BillBox ID e.g. `BB-A1B2-C3D4-E5F6` |
| name | string | Yes | Bill title |
| category | BillCategory | Yes | See categories in Bills API |
| amount | number | Yes | Bill amount |
| dueDate | ISO date string | No | Payment deadline |
| note | string | No | |

**Example Request**

```bash
curl -X POST http://localhost:3000/api/v1/inbox/send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientBillBoxId": "BB-A1B2-C3D4-E5F6",
    "name": "October Internet Bill",
    "category": "INTERNET",
    "amount": 1200,
    "dueDate": "2026-10-10"
  }'
```

**Example Response (201)**

```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "source": "INBOX",
    "status": "INBOX",
    "senderId": "clx...",
    "receiverId": "clx...",
    "sentAt": "2026-10-05T08:00:00.000Z",
    "receivedAt": "2026-10-05T08:00:00.000Z",
    ...
  },
  "timestamp": "2026-10-05T08:00:00.000Z"
}
```

**Errors**

| Status | Message |
|--------|---------|
| 404 | No BillBox account found with ID "..." |
| 400 | You cannot send a bill to yourself |

---

### GET /inbox

List all bills currently in the authenticated user's inbox (`status = INBOX`), newest first.

**Example Request**

```bash
curl http://localhost:3000/api/v1/inbox \
  -H "Authorization: Bearer <token>"
```

**Example Response (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "name": "October Internet Bill",
      "status": "INBOX",
      "receivedAt": "2026-10-05T08:00:00.000Z",
      "senderId": "clx...",
      ...
    }
  ],
  "timestamp": "2026-10-05T08:00:00.000Z"
}
```

---

### GET /inbox/:id

Get a single inbox bill by ID. Only accessible while the bill is still in `INBOX` status.

**Errors**

| Status | Message |
|--------|---------|
| 404 | Bill not found |
| 403 | This bill is not in your inbox |

---

### POST /inbox/:id/confirm

Confirm an inbox bill. The bill's status becomes `UNPAID` (or `PAID` if the sender pre-set it) after confirmation.

The recipient can optionally correct bill details before confirming.

**Request Body** (all fields optional)

| Field | Type | Notes |
|-------|------|-------|
| name | string | Override the bill name |
| category | BillCategory | Override the category |
| dueDate | ISO date string | Override the due date |
| note | string | Add a note |

**Example Request**

```bash
curl -X POST http://localhost:3000/api/v1/inbox/clx.../confirm \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "dueDate": "2026-10-12"
  }'
```

**Example Response (200)**

```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "status": "UPCOMING",  ← computed: UNPAID + dueDate within 3 days
    "confirmedAt": "2026-10-05T09:00:00.000Z",
    ...
  },
  "timestamp": "2026-10-05T09:00:00.000Z"
}
```

**Errors**

| Status | Message |
|--------|---------|
| 400 | Only INBOX bills can be confirmed |
| 404 | Bill not found |

---

## Flow

```
Sender: POST /inbox/send → bill created with status INBOX
Recipient: GET /inbox → sees new bill
Recipient: POST /inbox/:id/confirm → bill moves to UNPAID or PAID
Recipient: POST /bills/:id/pay → marks UNPAID bill as PAID
```
