import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillCategory, BillSource, BillType, BillDirection } from '../../../generated/prisma/enums.js';
import type { ApiBillStatus } from '../../../common/helpers/bill-status.helper.js';

export type BillSortField = 'issueDate' | 'dueDate' | 'amount' | 'createdAt';
export type SortOrder = 'asc' | 'desc';
export type BillStatusFilter = ApiBillStatus;

export class QueryBillsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(BillCategory)
  @IsOptional()
  category?: BillCategory;

  @IsEnum(BillSource)
  @IsOptional()
  source?: BillSource;

  @IsEnum(BillType)
  @IsOptional()
  type?: BillType;

  @IsEnum(BillDirection)
  @IsOptional()
  direction?: BillDirection;

  @IsEnum(['INBOX', 'UNPAID', 'PARTIALLY_PAID', 'UPCOMING', 'DUE_TODAY', 'OVERDUE', 'PAID'])
  @IsOptional()
  status?: BillStatusFilter;

  // Issue date range (renamed from billDate)
  @IsDateString()
  @IsOptional()
  issueDateFrom?: string;

  @IsDateString()
  @IsOptional()
  issueDateTo?: string;

  // Due date range
  @IsDateString()
  @IsOptional()
  dueDateFrom?: string;

  @IsDateString()
  @IsOptional()
  dueDateTo?: string;

  @IsEnum(['issueDate', 'dueDate', 'amount', 'createdAt'])
  @IsOptional()
  sort?: BillSortField;

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  order?: SortOrder;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
