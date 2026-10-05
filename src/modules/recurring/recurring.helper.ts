import { RecurringFrequency } from '../../generated/prisma/enums.js';

/**
 * Calculates the next due date after `from` based on frequency + dayRule.
 *
 * MONTHLY: dayRule = "1"–"28" (day of month)
 * WEEKLY:  dayRule = "0"–"6"  (0=Sunday, 6=Saturday)
 * YEARLY:  dayRule = "MM-DD"  e.g. "10-01" for Oct 1
 */
export function nextDueDate(
  frequency: RecurringFrequency,
  dayRule: string,
  from: Date,
): Date {
  const base = new Date(from);
  base.setHours(0, 0, 0, 0);

  switch (frequency) {
    case RecurringFrequency.MONTHLY: {
      const day = parseInt(dayRule, 10);
      // Try same month first, else next month
      let candidate = new Date(base.getFullYear(), base.getMonth(), day);
      if (candidate <= base) {
        candidate = new Date(base.getFullYear(), base.getMonth() + 1, day);
      }
      return candidate;
    }

    case RecurringFrequency.WEEKLY: {
      const targetDay = parseInt(dayRule, 10); // 0=Sun
      const currentDay = base.getDay();
      let daysUntil = (targetDay - currentDay + 7) % 7;
      if (daysUntil === 0) daysUntil = 7; // always next week, not today
      const candidate = new Date(base);
      candidate.setDate(base.getDate() + daysUntil);
      return candidate;
    }

    case RecurringFrequency.YEARLY: {
      const [mm, dd] = dayRule.split('-').map(Number);
      let candidate = new Date(base.getFullYear(), mm - 1, dd);
      if (candidate <= base) {
        candidate = new Date(base.getFullYear() + 1, mm - 1, dd);
      }
      return candidate;
    }
  }
}

/**
 * Calculates the generate-at date: due date minus generateDaysBefore.
 */
export function generateAtFromDueDate(dueDate: Date, generateDaysBefore: number): Date {
  const d = new Date(dueDate);
  d.setDate(d.getDate() - generateDaysBefore);
  d.setHours(0, 0, 0, 0);
  return d;
}
