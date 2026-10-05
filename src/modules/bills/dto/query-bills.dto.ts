import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { BillCategory } from '../../../generated/prisma/enums.js';
import type { ApiBillStatus } from '../../../common/helpers/bill-status.helper.js';

export type BillSortField = 'billDate' | 'dueDate' | 'amount' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

// All status values a client can filter by (includes computed states)
export type BillStatusFilter = ApiBillStatus;

export class QueryBillsDto {
  // Full-text search across bill name and biller name
  @IsString()
  @IsOptional()
  search?: string;

  // Filter by category
  @IsEnum(BillCategory)
  @IsOptional()
  category?: BillCategory;

  // Filter by lifecycle status (including computed UPCOMING, DUE_TODAY, OVERDUE)
  @IsEnum(['INBOX', 'UNPAID', 'UPCOMING', 'DUE_TODAY', 'OVERDUE', 'PAID'])
  @IsOptional()
  status?: BillStatusFilter;

  // Bill date range
  @IsDateString()
  @IsOptional()
  billDateFrom?: string;

  @IsDateString()
  @IsOptional()
  billDateTo?: string;

  // Due date range
  @IsDateString()
  @IsOptional()
  dueDateFrom?: string;

  @IsDateString()
  @IsOptional()
  dueDateTo?: string;

  // Sorting
  @IsEnum(['billDate', 'dueDate', 'amount', 'createdAt'])
  @IsOptional()
  sort?: BillSortField;

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  order?: SortOrder;

  // Pagination
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
