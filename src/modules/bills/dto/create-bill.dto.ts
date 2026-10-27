import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { BillCategory, BillDirection, BillStatus } from '../../../generated/prisma/enums.js';

export class CreateBillDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(BillCategory)
  category: BillCategory;

  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  amount: string;

  @IsDateString()
  @IsOptional()
  issueDate?: string; // date printed on the bill

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  contactId?: string;

  @IsEnum(BillDirection)
  @IsOptional()
  direction?: BillDirection;

  @IsEnum(BillStatus)
  @IsOptional()
  status?: Extract<BillStatus, 'UNPAID' | 'PAID'>;
}
