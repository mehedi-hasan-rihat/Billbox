import { IsNotEmpty, IsString } from 'class-validator';

export class LookupBillerDto {
  @IsString()
  @IsNotEmpty()
  billBoxId: string;
}
