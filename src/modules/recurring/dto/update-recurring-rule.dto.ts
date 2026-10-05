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
import { BillCategory } from '../../../generated/prisma/enums.js';

export class UpdateRecurringRuleDto {
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

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  senderBillerId?: string | null;

  @IsString()
  @IsOptional()
  dayRule?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  @IsOptional()
  generateDaysBefore?: number;

  @IsDateString()
  @IsOptional()
  endsAt?: string | null;
}
