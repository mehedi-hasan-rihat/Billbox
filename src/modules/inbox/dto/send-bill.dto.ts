import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';
import { BillCategory, BillStatus } from '../../../generated/prisma/enums.js';

export class SendBillDto {
  @IsString()
  @IsNotEmpty()
  recipientBillBoxId: string; // receiver's BillBox ID

  @IsString()
  @IsNotEmpty()
  name: string; // bill name/title

  @IsEnum(BillCategory)
  category: BillCategory;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  note?: string;

  /**
   * The status the bill should become after the receiver confirms it.
   * Sender controls this. Allowed: UNPAID or PAID.
   * Defaults to UNPAID if not provided.
   */
  @IsEnum(BillStatus)
  @IsOptional()
  confirmedStatus?: Extract<BillStatus, 'UNPAID' | 'PAID'>;
}
