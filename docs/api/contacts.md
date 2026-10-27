# Contacts API

Base path: `/api/v1/contacts`

All endpoints require authentication: `Authorization: Bearer <token>`

A **contact** is a party in your personal list — someone who bills you (an expense/OUTGOING party) or someone you bill (an income/INCOMING party). Contacts are private per user.

A contact can be:
- A **BillBox user** — identified by their `billBoxId`, enabling direct inbox sending
- An **external party** — stored with name, phone, email, and/or address only

---

## Endpoints

### GET /contacts/lookup?billBoxId=

Look up a BillBox user by their BillBox ID before creating a contact. Returns their public profile so you can pre-fill the contact form.

**Query Parameters**

| Param | Type | Required |
|-------|------|----------|
| billBoxId | string | Yes |

**Example Request**

```bash
curl "http://localhost:3000/api/v1/contacts/lookup?billBoxId=BB-A1B2-C3D4-E5F6" \
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

### POST /contacts

Create a new contact.

**Request Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | Yes | Display name |
| phone | string | No | |
| email | string | No | Valid email |
| address | string | No | |
| billBoxId | string | No | If this contact is a BillBox user |

**Example — BillBox user as contact**

```bash
curl -X POST http://localhost:3000/api/v1/contacts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rakib",
    "billBoxId": "BB-A1B2-C3D4-E5F6"
  }'
```

**Example — External contact**

```bash
curl -X POST http://localhost:3000/api/v1/contacts \
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

### GET /contacts

List all contacts belonging to the authenticated user, sorted by name.

**Example Request**

```bash
curl http://localhost:3000/api/v1/contacts \
  -H "Authorization: Bearer <token>"
```

---

### GET /contacts/:id

Get a single contact by ID.

**Errors**

| Status | Message |
|--------|---------|
| 404 | Contact not found |

---

### PATCH /contacts/:id

Update a contact. All fields are optional.

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
| 404 | Contact not found |

---

### DELETE /contacts/:id

Delete a contact. Existing bills and recurring rules linked to this contact retain the `contactId` reference in the database — the contact record is removed from your list only.

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
| 404 | Contact not found |

---

## Using a Contact when creating a bill

When creating a bill via `POST /bills`, pass the contact's ID as `contactId`:

```json
{
  "name": "October Internet Bill",
  "category": "INTERNET",
  "amount": "1200.00",
  "dueDate": "2026-10-10",
  "direction": "OUTGOING",
  "contactId": "clx..."
}
```

The bill response will include the full `contact` object.

## Using a Contact in a recurring rule

When creating a recurring rule via `POST /recurring`, pass the contact's ID as `contactId`:

```json
{
  "name": "Monthly Internet",
  "category": "INTERNET",
  "amount": "1200.00",
  "frequency": "MONTHLY",
  "dayRule": "10",
  "contactId": "clx..."
}
```
