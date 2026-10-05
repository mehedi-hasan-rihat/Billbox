# Bills API

Base path: `/api/v1/bills`

All endpoints require authentication: `Authorization: Bearer <token>`

---

## Bill Status

The `status` field in every API response represents the **effective current state** of the bill.
Three values are persisted in the database. Two are computed at query time and never stored.

| Status | Persisted in DB | Set by | Meaning |
|--------|----------------|--------|---------|
| `INBOX` | ✅ | System | Arrived via BillBox ID, not yet confirmed by recipient |
| `UNPAID` | ✅ | User | Confirmed/created, payment not yet made |
| `PAID` | ✅ | User | Payment completed |
| `UPCOMING` | ❌ computed | System | `UNPAID` + due date is in the future |
| `DUE_TODAY` | ❌ computed | System | `UNPAID` + due date is today |
| `OVERDUE` | ❌ computed | System | `UNPAID` + due date has passed |

### How it works

The DB only ever holds `INBOX`, `UNPAID`, or `PAID`. On every read, the system computes the real effective status from `status + dueDate` and overwrites `status` in the response. No scheduler or cron job needed — always accurate to the second.

```
DB stores:   UNPAID  (dueDate: 2026-10-08)  →  API returns: UPCOMING
DB stores:   UNPAID  (dueDate: 2026-10-05)  →  API returns: DUE_TODAY
DB stores:   UNPAID  (dueDate: 2026-10-03)  →  API returns: OVERDUE
DB stores:   UNPAID  (no dueDate)           →  API returns: UNPAID
```

### Why not store UPCOMING / OVERDUE in the DB?

Storing them requires a background job to update bills as time passes. If that job fails or is delayed, statuses become stale. Computing at read time is always correct, zero maintenance, no infrastructure needed.

---

## Bill Source

How the bill entered BillBox. Always one of:

| Source | Meaning |
|--------|---------|
| `MANUAL` | Created by the user themselves (including recurring-generated bills) |
| `INBOX` | Arrived via BillBox ID from another user |

---

## Bill Type

What kind of bill it is:

| Type | Meaning |
|------|---------|
| `ONE_TIME` | A regular single bill |
| `RECURRING` | Auto-generated from a recurring rule |

A recurring-generated bill has `source = MANUAL` and `type = RECURRING`. Use `type` to distinguish recurring bills from one-time bills.

---

## Categories

`INTERNET` `ELECTRICITY` `GAS` `WATER` `MOBILE` `RESTAURANT` `SHOPPING` `SUBSCRIPTION` `RENT` `EDUCATION` `OTHER`

---

## Payment Methods

`CASH` `BKASH` `NAGAD` `BANK` `CARD` `OTHER`

---

## Endpoints

### POST /bills

Create a bill manually.

**Request Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | Yes | Bill title |
| category | BillCategory | Yes | See categories above |
| amount | string (decimal) | Yes | e.g. `"1200.00"` |
| billDate | ISO date string | No | Date printed on the bill |
| dueDate | ISO date string | No | Payment deadline |
| note | string | No | Free text note |
| senderBillerId | string | No | ID of a biller from your biller list |
| status | `UNPAID` \| `PAID` | No | Defaults to `UNPAID` |
| paidAt | ISO date string | Required if `status=PAID` | |
| paidAmount | string (decimal) | No | |
| paymentMethod | PaymentMethod | No | |
| paymentReference | string | No | Transaction ID / receipt number |

**Example Request**

```bash
curl -X POST http://localhost:3000/api/v1/bills \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "October Internet Bill",
    "category": "INTERNET",
    "amount": "1200.00",
    "dueDate": "2026-10-10",
    "status": "UNPAID"
  }'
```

**Example Response (201)**

```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "userId": "clx...",
    "source": "MANUAL",
    "type": "ONE_TIME",
    "name": "October Internet Bill",
    "category": "INTERNET",
    "amount": "1200.00",
    "billDate": null,
    "dueDate": "2026-10-10T00:00:00.000Z",
    "note": null,
    "senderBillerId": null,
    "senderBiller": null,
    "recurringRuleId": null,
    "status": "UPCOMING",
    "paidAt": null,
    "paidAmount": null,
    "paymentMethod": null,
    "paymentReference": null,
    "createdAt": "2026-10-05T08:00:00.000Z",
    "updatedAt": "2026-10-05T08:00:00.000Z"
  },
  "timestamp": "2026-10-05T08:00:00.000Z"
}
```

**Errors**

| Status | Message |
|--------|---------|
| 400 | `paidAt` is required when creating a bill as PAID |
| 400 | Validation errors |
| 404 | Biller not found (if `senderBillerId` is invalid) |

---

### GET /bills

List the authenticated user's bills with optional search, filtering, sorting, and pagination. All parameters are optional and composable.

**Query Parameters**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| search | string | — | Case-insensitive search across bill name and biller name |
| category | BillCategory | — | Filter by category |
| source | `MANUAL` \| `INBOX` | — | Filter by how the bill entered BillBox |
| type | `ONE_TIME` \| `RECURRING` | — | Filter by bill type |
| status | BillStatusFilter | — | `INBOX` `UNPAID` `UPCOMING` `DUE_TODAY` `OVERDUE` `PAID` |
| billDateFrom | ISO date | — | Bill date range start |
| billDateTo | ISO date | — | Bill date range end |
| dueDateFrom | ISO date | — | Due date range start |
| dueDateTo | ISO date | — | Due date range end |
| sort | string | `createdAt` | `billDate` `dueDate` `amount` `createdAt` |
| order | string | `desc` | `asc` \| `desc` |
| page | number | `1` | Min: 1 |
| limit | number | `20` | Min: 1, Max: 100 |

**Status filter behaviour**

`UPCOMING`, `DUE_TODAY`, and `OVERDUE` are translated into DB conditions at query time:

| Filter | DB condition |
|--------|-------------|
| `UPCOMING` | `status = UNPAID AND dueDate > today` |
| `DUE_TODAY` | `status = UNPAID AND dueDate = today` |
| `OVERDUE` | `status = UNPAID AND dueDate < today` |
| `UNPAID` | `status = UNPAID AND dueDate IS NULL` |
| `INBOX`, `PAID` | `status = <value>` |

**Example Requests**

```bash
# All overdue bills
GET /api/v1/bills?status=OVERDUE

# All recurring bills
GET /api/v1/bills?type=RECURRING

# Internet bills due this month, sorted by due date
GET /api/v1/bills?category=INTERNET&dueDateFrom=2026-10-01&dueDateTo=2026-10-31&sort=dueDate&order=asc

# Search by name, page 2
GET /api/v1/bills?search=internet&page=2&limit=10
```

**Example Response (200)**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "clx...",
        "source": "MANUAL",
        "type": "ONE_TIME",
        "name": "October Internet Bill",
        "status": "UPCOMING",
        "category": "INTERNET",
        "amount": "1200.00",
        "dueDate": "2026-10-10T00:00:00.000Z",
        "recurringRuleId": null,
        ...
      }
    ],
    "meta": {
      "total": 42,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  },
  "timestamp": "2026-10-05T08:00:00.000Z"
}
```

**Errors**

| Status | Message |
|--------|---------|
| 400 | Validation errors (invalid category, status, sort field, etc.) |

---

### GET /bills/:id

Get a single bill by ID.

**Example Request**

```bash
curl http://localhost:3000/api/v1/bills/clx... \
  -H "Authorization: Bearer <token>"
```

**Errors**

| Status | Message |
|--------|---------|
| 404 | Bill not found |

---

### PATCH /bills/:id

Edit bill details. Status transitions are not allowed here — use dedicated endpoints.

**Request Body** (all fields optional)

| Field | Type | Notes |
|-------|------|-------|
| name | string | |
| category | BillCategory | |
| amount | string (decimal) | |
| billDate | ISO date string | |
| dueDate | ISO date string | |
| senderBillerId | string \| null | Set to `null` to remove |

**Errors**

| Status | Message |
|--------|---------|
| 404 | Bill not found |
| 404 | Biller not found |

---

### GET /bills/:id/timeline

Get the full event history for a bill in chronological order.

**Example Response (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "billId": "clx...",
      "type": "CREATED",
      "actor": {
        "id": "clx...",
        "email": "mehedi@example.com",
        "name": "Mehedi",
        "billBoxId": "BB-A1B2-C3D4-E5F6"
      },
      "metadata": { "status": "UNPAID", "source": "MANUAL" },
      "createdAt": "2026-10-05T08:00:00.000Z"
    },
    {
      "type": "PAID",
      "metadata": { "paidAt": "2026-10-08", "method": "BKASH" },
      ...
    }
  ],
  "timestamp": "2026-10-05T08:00:00.000Z"
}
```

**Event types:**
`CREATED` `SENT` `RECEIVED` `CONFIRMED` `PAID` `EDITED` `NOTE_ADDED` `PAYMENT_UPDATED` `RECURRING_GENERATED`

---

### POST /bills/:id/pay

Mark an `UNPAID` bill as `PAID` and record payment details.

**Request Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| paidAt | ISO date string | Yes | When payment was made |
| paidAmount | string (decimal) | No | Actual amount paid |
| paymentMethod | PaymentMethod | No | |
| paymentReference | string | No | Transaction ID / receipt number |

**Example Request**

```bash
curl -X POST http://localhost:3000/api/v1/bills/clx.../pay \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "paidAt": "2026-10-08",
    "paidAmount": "1200.00",
    "paymentMethod": "BKASH",
    "paymentReference": "TXN8FK2910"
  }'
```

**Errors**

| Status | Message |
|--------|---------|
| 400 | Bill is already paid |
| 400 | Only UNPAID bills can be marked as paid |
| 404 | Bill not found |

---

### PATCH /bills/:id/payment

Update payment metadata on an already `PAID` bill.

**Request Body** (all fields optional)

| Field | Type |
|-------|------|
| paidAt | ISO date string |
| paidAmount | string (decimal) |
| paymentMethod | PaymentMethod |
| paymentReference | string |

**Errors**

| Status | Message |
|--------|---------|
| 400 | Payment metadata can only be updated on a PAID bill |
| 404 | Bill not found |

---

### PATCH /bills/:id/notes

Add or update the note on a bill. Send `null` to clear it.

**Request Body**

| Field | Type | Notes |
|-------|------|-------|
| note | string \| null | Pass `null` to remove the note |

**Example Request**

```bash
curl -X PATCH http://localhost:3000/api/v1/bills/clx.../notes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "note": "Paid via bKash agent" }'
```
