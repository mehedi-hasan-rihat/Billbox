import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums.js';

export class UpdatePaymentDto {
  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  @IsOptional()
  amount?: string;

  @IsDateString()
  @IsOptional()
  paidOn?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  paymentReference?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
