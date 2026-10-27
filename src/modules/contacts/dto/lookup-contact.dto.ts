import { IsNotEmpty, IsString } from 'class-validator';

export class LookupContactDto {
  @IsString()
  @IsNotEmpty()
  billBoxId: string;
}
