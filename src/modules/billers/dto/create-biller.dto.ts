import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBillerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  // If the biller is a BillBox user, provide their BillBox ID.
  @IsString()
  @IsOptional()
  billBoxId?: string;
}
