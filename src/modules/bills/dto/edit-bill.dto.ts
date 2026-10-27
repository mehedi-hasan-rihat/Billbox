import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { BillCategory, BillDirection } from '../../../generated/prisma/enums.js';

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
  issueDate?: string; // renamed from billDate

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  contactId?: string | null;

  @IsEnum(BillDirection)
  @IsOptional()
  direction?: BillDirection;
}
