import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums.js';

// Update payment metadata on an already-PAID bill
export class UpdatePaymentDto {
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
