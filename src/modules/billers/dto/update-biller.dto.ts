import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateBillerDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  billBoxId?: string;
}
