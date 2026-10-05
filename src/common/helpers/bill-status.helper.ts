import { BillStatus } from '../../generated/prisma/enums.js';

// The full status surface exposed in API responses.
// INBOX, UNPAID, PAID are persisted. UPCOMING, DUE_TODAY and OVERDUE are computed.
export type ApiBillStatus = BillStatus | 'UPCOMING' | 'DUE_TODAY' | 'OVERDUE';

/**
 * Computes the API status for a bill.
 *
 * Rules:
 *  - INBOX / PAID → returned as-is
 *  - UNPAID + no due date → UNPAID
 *  - UNPAID + due date in the future → UPCOMING
 *  - UNPAID + due date is today → DUE_TODAY
 *  - UNPAID + due date passed → OVERDUE
 */
function computeStatus(
  persistedStatus: BillStatus,
  dueDate: Date | null,
): ApiBillStatus {
  if (persistedStatus !== BillStatus.UNPAID) {
    return persistedStatus;
  }

  if (!dueDate) {
    return BillStatus.UNPAID;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  if (due < today) return 'OVERDUE';
  if (due.getTime() === today.getTime()) return 'DUE_TODAY';
  return 'UPCOMING';
}

/**
 * Returns the bill with `status` overwritten by the computed API status.
 * The DB value is never changed — only the response shape changes.
 */
export function withComputedStatus<T extends { status: BillStatus; dueDate: Date | null }>(
  bill: T,
): Omit<T, 'status'> & { status: ApiBillStatus } {
  return { ...bill, status: computeStatus(bill.status, bill.dueDate) };
}

export function withComputedStatusMany<T extends { status: BillStatus; dueDate: Date | null }>(
  bills: T[],
): (Omit<T, 'status'> & { status: ApiBillStatus })[] {
  return bills.map(withComputedStatus);
}
