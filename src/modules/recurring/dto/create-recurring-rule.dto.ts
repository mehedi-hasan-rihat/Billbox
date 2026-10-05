import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillCategory, RecurringFrequency } from '../../../generated/prisma/enums.js';

export class CreateRecurringRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(BillCategory)
  category: BillCategory;

  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  amount: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  senderBillerId?: string;

  @IsEnum(RecurringFrequency)
  frequency: RecurringFrequency;

  /**
   * Day rule for scheduling:
   * - MONTHLY: day of month as string "1"–"28"
   * - WEEKLY:  day of week as string "0"(Sun)–"6"(Sat)
   * - YEARLY:  month-day as "MM-DD" e.g. "10-01"
   */
  @IsString()
  @IsNotEmpty()
  dayRule: string;

  /**
   * How many days before the due date to generate the bill.
   * Defaults to 5 — bill appears as UPCOMING immediately.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  @IsOptional()
  generateDaysBefore?: number;

  /**
   * When to start — first generation date.
   * Defaults to the next occurrence calculated from dayRule.
   */
  @IsDateString()
  @IsOptional()
  startAt?: string;

  /** Optional end date for the recurrence. */
  @IsDateString()
  @IsOptional()
  endsAt?: string;
}
