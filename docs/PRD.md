# BillBox — Product Requirements Document

## 1. Concept

BillBox is a personal bill inbox and management system. People receive bills from many sources — Internet, Electricity, Mobile, Restaurant, Shopping, Subscription — in various formats: PDF, image, online, or paper. BillBox brings them all into one place.

Each user gets a unique **BillBox ID** (e.g. `mehedi@billbox.app`) that providers or senders can use to send bills directly. Users can also create bills manually, confirm them, track payment status, receive due-date reminders, and store bill/receipt copies.

## 2. Problem

Bills are scattered across email attachments, phone galleries, WhatsApp chats, paper receipts, and provider websites. Answering simple questions becomes hard:

- Which bills are unpaid?
- Which bill's deadline is approaching?
- Which bill is overdue?
- Where is last month's restaurant bill?
- Where did I save that bill PDF?

BillBox consolidates everything into a personal bill inbox with lifecycle tracking and reminders.

## 3. Core Idea

Every user has a personal BillBox ID. Senders can push bills to this ID, and users can also add bills manually. The lifecycle is:

```
PENDING → Confirm → Track → Remind → Pay → Keep the receipt
```

## 4. Bill Types

Internet, Electricity, Gas, Water, Mobile, Restaurant, Shopping, Subscription, Rent, Education/Tuition, and Other (warranty/purchase receipts).

## 5. Bill Receiving

### 5.1 Via BillBox ID

A sender pushes a bill to `mehedi@billbox.app`. The bill arrives in the user's inbox with: name, amount, due date, optional image/PDF, and sender metadata.

### 5.2 Manual Creation

Users create bills directly with title, amount, due date, category, and recurring flag.

### 5.3 Bill Copy

Users can attach images or PDFs to any bill for record-keeping.

## 6. Bill Status

Three **persisted** payment states:

| State | Set by | Meaning |
|-------|--------|---------|
| PENDING | System | Bill received, not yet confirmed by user |
| UNPAID | User | Bill confirmed, payment not yet made |
| PAID | User | Payment completed |

Two **derived** states (not persisted, computed at query time):

| State | Derived from | Meaning |
|-------|-------------|---------|
| UPCOMING | UNPAID + due date within reminder window | Bill due soon |
| OVERDUE | UNPAID + due date passed | Payment past due |

### Status Transitions

```
PENDING → UNPAID → PAID

UNPAID + due date approaching → shows as UPCOMING
UNPAID + due date passed      → shows as OVERDUE

UPCOMING → PAID  (paid before due date)
OVERDUE  → PAID  (paid after due date)
```

## 7. Reminder System

Users can configure reminders when creating or confirming a bill (e.g. 3 days before, 2 days before, 1 day before, on due date). Reminders stop once the bill is marked PAID.

## 8. Recurring Bills

Users can set up recurring bills (e.g. monthly Internet bill). BillBox auto-generates the next bill each cycle. Each generated bill has its own independent payment lifecycle.

## 9. Bill Information

A bill can include: bill name, category, amount, bill date, due date, status, paid date, paid amount, payment method, payment reference, sender, received date, attachments, notes, recurring info, reminder settings.

## 10. Search & Filter

Users can search by text and filter by:
- Status (UNPAID, PAID, UPCOMING, OVERDUE)
- Category (Internet, Restaurant, etc.)
- Date range (this month, last month, custom)
- Amount range

## 11. Bill History

Each bill records its lifecycle changes (created, confirmed, upcoming, paid, overdue) with timestamps, so users can review what happened.

## 12. Notifications

BillBox notifies users about: new bill received, pending confirmation, upcoming due date, overdue bill, recurring bill generated. Notification preferences are configurable.

## 13. Scope Boundaries

**In scope (MVP):** Bill receiving, manual creation, confirmation, 5 bill statuses, due dates, reminders, recurring bills, image/PDF attachments, search, filtering, payment records, bill history.

**Out of scope:** Online payment gateway, bank account management, full personal finance management, budget planning, investment tracking, bill sharing, social features, email service, general-purpose cloud storage.