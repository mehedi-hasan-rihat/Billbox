import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateContactDto {
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
