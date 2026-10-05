import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { BillCategory } from '../../../generated/prisma/enums.js';

// Receiver can optionally correct bill details before confirming.
// The target status is set by the sender (confirmedStatus on the bill).
export class ConfirmBillDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(BillCategory)
  @IsOptional()
  category?: BillCategory;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
