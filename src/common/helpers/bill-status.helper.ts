import { BillStatus } from '../../generated/prisma/enums.js';
import type { Decimal } from '../../generated/prisma/internal/prismaNamespace.js';

// Full status surface exposed in API responses.
// INBOX, UNPAID, PARTIALLY_PAID, PAID are persisted.
// UPCOMING, DUE_TODAY, OVERDUE are computed from UNPAID/PARTIALLY_PAID + dueDate.
export type ApiBillStatus =
  | BillStatus
  | 'UPCOMING'
  | 'DUE_TODAY'
  | 'OVERDUE';

/**
 * Computes the effective API status.
 *
 * INBOX / PAID → as-is
 * PARTIALLY_PAID + dueDate logic → PARTIALLY_PAID (no computed variants — they still owe something)
 * UNPAID / PARTIALLY_PAID + no due date → as-is
 * UNPAID + due in future → UPCOMING
 * UNPAID + due today → DUE_TODAY
 * UNPAID + due passed → OVERDUE
 */
function computeStatus(
  persistedStatus: BillStatus,
  dueDate: Date | null,
): ApiBillStatus {
  if (
    persistedStatus === BillStatus.INBOX ||
    persistedStatus === BillStatus.PAID
  ) {
    return persistedStatus;
  }

  // PARTIALLY_PAID: always show as-is regardless of due date
  // (UI can show overdue indicator separately based on dueDate field)
  if (persistedStatus === BillStatus.PARTIALLY_PAID) {
    return BillStatus.PARTIALLY_PAID;
  }

  // UNPAID — compute from dueDate
  if (!dueDate) return BillStatus.UNPAID;

  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due   = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  if (due < today) return 'OVERDUE';
  if (due.getTime() === today.getTime()) return 'DUE_TODAY';
  return 'UPCOMING';
}

// ── Bill shape with computed fields ────────────────────────────────────────

export type BillWithPayments<T> = T & {
  payments: { amount: Decimal }[];
};

export type ComputedBill<T> = Omit<T, 'status'> & {
  status: ApiBillStatus;
  totalPaid: string;
  remaining: string;
};

export function withComputedStatus<
  T extends {
    status: BillStatus;
    dueDate: Date | null;
    amount: Decimal;
    payments: { amount: Decimal }[];
  },
>(bill: T): ComputedBill<T> {
  const totalPaid = bill.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  const remaining = Math.max(0, Number(bill.amount) - totalPaid);

  return {
    ...bill,
    status: computeStatus(bill.status, bill.dueDate),
    totalPaid: totalPaid.toFixed(2),
    remaining: remaining.toFixed(2),
  };
}

export function withComputedStatusMany<
  T extends {
    status: BillStatus;
    dueDate: Date | null;
    amount: Decimal;
    payments: { amount: Decimal }[];
  },
>(bills: T[]): ComputedBill<T>[] {
  return bills.map(withComputedStatus);
}
