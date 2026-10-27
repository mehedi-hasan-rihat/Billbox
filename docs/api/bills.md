# Bills API

Base path: `/api/v1/bills`

All endpoints require authentication: `Authorization: Bearer <token>`

---

## Bill Status

The `status` field in every API response represents the **effective current state** of the bill.
Four values are persisted in the database. Three are computed at query time and never stored.

| Status | Persisted in DB | Set by | Meaning |
|--------|----------------|--------|---------|
| `INBOX` | ✅ | System | Arrived via BillBox ID, not yet confirmed by recipient |
| `UNPAID` | ✅ | System | Confirmed/created, no payments recorded |
| `PARTIALLY_PAID` | ✅ | System | At least one payment recorded but total < bill amount |
| `PAID` | ✅ | System | Total payments >= bill amount |
| `UPCOMING` | ❌ computed | System | `UNPAID` + due date is in the future |
| `DUE_TODAY` | ❌ computed | System | `UNPAID` + due date is today |
| `OVERDUE` | ❌ computed | System | `UNPAID` + due date has passed |

### How it works

Payment status (`UNPAID` / `PARTIALLY_PAID` / `PAID`) is re-derived automatically whenever a payment is added, updated, or deleted — it reflects the sum of all payments vs the bill amount. On every read, the system also computes the effective status from `status + dueDate` and overwrites `status` in the response.

```
DB stores:   UNPAID  (dueDate: 2026-10-08)  →  API returns: UPCOMING
DB stores:   UNPAID  (dueDate: 2026-10-05)  →  API returns: DUE_TODAY
DB stores:   UNPAID  (dueDate: 2026-10-03)  →  API returns: OVERDUE
DB stores:   UNPAID  (no dueDate)           →  API returns: UNPAID
DB stores:   PARTIALLY_PAID                 →  API returns: PARTIALLY_PAID (always, regardless of dueDate)
DB stores:   PAID                           →  API returns: PAID
```

`PARTIALLY_PAID` is always returned as-is. The `dueDate` field can be used to show an overdue indicator in the UI if needed.

### Why not store UPCOMING / OVERDUE in the DB?

Storing them requires a background job to update bills as time passes. If that job fails or is delayed, statuses become stale. Computing at read time is always correct, zero maintenance, no infrastructure needed.

---

## Bill Direction

Whether the bill represents money flowing out (expense) or money coming in (income).

| Direction | Meaning |
|-----------|---------|
| `OUTGOING` | You owe money — an expense / debit (default) |
| `INCOMING` | You are owed money — income / credit |

Bills received via inbox are `OUTGOING` by default (the recipient owes the amount). When creating a manual bill, pass `direction: "INCOMING"` to record it as income.

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
| issueDate | ISO date string | No | Date printed on the bill |
| dueDate | ISO date string | No | Payment deadline |
| note | string | No | Initial note — stored as the first item in the `notes` array |
| contactId | string | No | ID of a contact from your contacts list |
| direction | `OUTGOING` \| `INCOMING` | No | Default: `OUTGOING` |

**Example Request**

```bash
curl -X POST http://localhost:3000/api/v1/bills \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "October Internet Bill",
    "category": "INTERNET",
    "amount": "1200.00",
    "dueDate": "2026-10-10"
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
    "direction": "OUTGOING",
    "name": "October Internet Bill",
    "category": "INTERNET",
    "amount": "1200.00",
    "issueDate": null,
    "dueDate": "2026-10-10T00:00:00.000Z",
    "notes": [],
    "contactId": null,
    "contact": null,
    "recurringRuleId": null,
    "status": "UPCOMING",
    "totalPaid": "0.00",
    "remaining": "1200.00",
    "payments": [],
    "createdAt": "2026-10-05T08:00:00.000Z",
    "updatedAt": "2026-10-05T08:00:00.000Z"
  },
  "timestamp": "2026-10-05T08:00:00.000Z"
}
```

**Errors**

| Status | Message |
|--------|---------|
| 400 | Validation errors |
| 404 | Contact not found (if `contactId` is invalid) |

---

### GET /bills

List the authenticated user's bills with optional search, filtering, sorting, and pagination. All parameters are optional and composable.

**Query Parameters**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| search | string | — | Case-insensitive search across bill name and contact name |
| category | BillCategory | — | Filter by category |
| source | `MANUAL` \| `INBOX` | — | Filter by how the bill entered BillBox |
| type | `ONE_TIME` \| `RECURRING` | — | Filter by bill type |
| direction | `OUTGOING` \| `INCOMING` | — | Filter by direction (expense vs income) |
| status | BillStatusFilter | — | `INBOX` `UNPAID` `PARTIALLY_PAID` `UPCOMING` `DUE_TODAY` `OVERDUE` `PAID` |
| issueDateFrom | ISO date | — | Issue date range start |
| issueDateTo | ISO date | — | Issue date range end |
| dueDateFrom | ISO date | — | Due date range start |
| dueDateTo | ISO date | — | Due date range end |
| sort | string | `createdAt` | `issueDate` `dueDate` `amount` `createdAt` |
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
| `PARTIALLY_PAID` | `status = PARTIALLY_PAID` |
| `INBOX`, `PAID` | `status = <value>` |

**Example Requests**

```bash
# All overdue bills
GET /api/v1/bills?status=OVERDUE

# All partially paid bills
GET /api/v1/bills?status=PARTIALLY_PAID

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
        "totalPaid": "0.00",
        "remaining": "1200.00",
        "recurringRuleId": null,
        "payments": [],
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

Edit bill details. Status transitions are not allowed here — use the payments endpoints.

**Request Body** (all fields optional)

| Field | Type | Notes |
|-------|------|-------|
| name | string | |
| category | BillCategory | |
| amount | string (decimal) | |
| issueDate | ISO date string | Date printed on the bill |
| dueDate | ISO date string | |
| contactId | string \| null | Set to `null` to remove |
| direction | `OUTGOING` \| `INCOMING` | Change direction |

**Errors**

| Status | Message |
|--------|---------|
| 404 | Bill not found |
| 404 | Contact not found |

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
      "metadata": { "source": "MANUAL" },
      "createdAt": "2026-10-05T08:00:00.000Z"
    },
    {
      "type": "PAYMENT_ADDED",
      "metadata": { "paymentId": "clx...", "amount": "600.00", "paidOn": "2026-10-08", "method": "BKASH" },
      ...
    },
    {
      "type": "FULLY_PAID",
      "metadata": { "totalPaid": "1200.00" },
      ...
    }
  ],
  "timestamp": "2026-10-05T08:00:00.000Z"
}
```

**Event types:**
`CREATED` `SENT` `RECEIVED` `CONFIRMED` `PAYMENT_ADDED` `FULLY_PAID` `PAYMENT_UPDATED` `PAYMENT_DELETED` `EDITED` `NOTE_ADDED` `NOTE_UPDATED` `NOTE_DELETED` `RECURRING_GENERATED`

---

### POST /bills/:id/notes

Append a note to a bill's `notes` array.

**Request Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| note | string | Yes | The note text to append |

**Example Request**

```bash
curl -X POST http://localhost:3000/api/v1/bills/clx.../notes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "note": "Paid via bKash agent" }'
```

**Errors**

| Status | Message |
|--------|---------|
| 404 | Bill not found |

---

### PATCH /bills/:id/notes/:noteIndex

Update a single note by its index in the `notes` array.

**Request Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| note | string | Yes | The new note text |

**Example Request**

```bash
curl -X PATCH http://localhost:3000/api/v1/bills/clx.../notes/0 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "note": "Updated note text" }'
```

**Errors**

| Status | Message |
|--------|---------|
| 404 | Bill not found |
| 404 | Note not found (index out of range) |

---

### DELETE /bills/:id/notes/:noteIndex

Delete a note by its index in the `notes` array.

**Example Request**

```bash
curl -X DELETE http://localhost:3000/api/v1/bills/clx.../notes/0 \
  -H "Authorization: Bearer <token>"
```

**Errors**

| Status | Message |
|--------|---------|
| 404 | Bill not found |
| 404 | Note not found (index out of range) |

---

## Payment Endpoints

Bills support partial and multiple payments. Each payment is an independent record. The bill's `status` is automatically re-derived after every payment change:

- No payments → `UNPAID`
- Total payments < bill amount → `PARTIALLY_PAID`
- Total payments >= bill amount → `PAID`

The bill response always includes `totalPaid` and `remaining` computed fields, plus the full `payments` array.

---

### POST /bills/:id/payments

Add a payment to a bill. The bill status is recomputed automatically.

**Request Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| amount | string (decimal) | Yes | Must be > 0 |
| paidOn | ISO date string | Yes | When this payment was made |
| paymentMethod | PaymentMethod | No | |
| paymentReference | string | No | Transaction ID / receipt number |
| note | string | No | Per-payment note |

**Example Request**

```bash
curl -X POST http://localhost:3000/api/v1/bills/clx.../payments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "600.00",
    "paidOn": "2026-10-08",
    "paymentMethod": "BKASH",
    "paymentReference": "TXN8FK2910"
  }'
```

**Errors**

| Status | Message |
|--------|---------|
| 400 | Confirm the bill before recording payments (INBOX bill) |
| 400 | Payment amount must be greater than 0 |
| 404 | Bill not found |

---

### GET /bills/:id/payments

List all payments for a bill, ordered by `paidOn` ascending.

**Example Response (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "billId": "clx...",
      "amount": "600.00",
      "paidOn": "2026-10-08T00:00:00.000Z",
      "paymentMethod": "BKASH",
      "paymentReference": "TXN8FK2910",
      "note": null,
      "createdAt": "2026-10-08T10:00:00.000Z"
    }
  ],
  "timestamp": "2026-10-08T10:00:00.000Z"
}
```

**Errors**

| Status | Message |
|--------|---------|
| 404 | Bill not found |

---

### PATCH /bills/:id/payments/:paymentId

Update a specific payment. All fields are optional. Bill status is recomputed after the update.

**Request Body**

| Field | Type |
|-------|------|
| amount | string (decimal) |
| paidOn | ISO date string |
| paymentMethod | PaymentMethod |
| paymentReference | string |
| note | string |

**Errors**

| Status | Message |
|--------|---------|
| 404 | Bill not found |
| 404 | Payment not found |

---

### DELETE /bills/:id/payments/:paymentId

Delete a specific payment. Bill status is recomputed after deletion.

**Errors**

| Status | Message |
|--------|---------|
| 404 | Bill not found |
| 404 | Payment not found |
