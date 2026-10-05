import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { BillCategory, BillStatus, PaymentMethod } from '../../../generated/prisma/enums.js';

export class CreateBillDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(BillCategory)
  category: BillCategory;

  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  amount: string; // string so Decimal precision is preserved across JSON

  @IsDateString()
  @IsOptional()
  billDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  note?: string;

  // Sender biller from the user's biller list (optional)
  @IsString()
  @IsOptional()
  senderBillerId?: string;

  /**
   * Initial status for a manually created bill.
   * Allowed: UNPAID or PAID. Defaults to UNPAID.
   */
  @IsEnum(BillStatus)
  @IsOptional()
  status?: Extract<BillStatus, 'UNPAID' | 'PAID'>;

  // Required when status = PAID
  @IsDateString()
  @IsOptional()
  paidAt?: string;

  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  @IsOptional()
  paidAmount?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  paymentReference?: string;
}
