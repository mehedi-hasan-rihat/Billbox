import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { BillCategory } from '../../../generated/prisma/enums.js';

// Generic edit — status transitions are NOT allowed here
export class EditBillDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsEnum(BillCategory)
  @IsOptional()
  category?: BillCategory;

  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  @IsOptional()
  amount?: string;

  @IsDateString()
  @IsOptional()
  billDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  // Change sender biller
  @IsString()
  @IsOptional()
  senderBillerId?: string | null;
}
