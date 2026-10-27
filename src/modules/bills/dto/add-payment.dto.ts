import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums.js';

export class AddPaymentDto {
  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  amount: string;

  @IsDateString()
  @IsNotEmpty()
  paidOn: string; // when this payment was made

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
