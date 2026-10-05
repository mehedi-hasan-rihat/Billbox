import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums.js';

export class PayBillDto {
  @IsDateString()
  @IsNotEmpty()
  paidAt: string;

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
