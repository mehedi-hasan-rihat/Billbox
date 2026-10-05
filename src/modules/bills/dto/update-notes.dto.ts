import { IsOptional, IsString } from 'class-validator';

export class UpdateNotesDto {
  @IsString()
  @IsOptional()
  note?: string | null;
}
