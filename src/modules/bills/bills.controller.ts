import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { BillsService } from './bills.service.js';
import { CreateBillDto } from './dto/create-bill.dto.js';
import { EditBillDto } from './dto/edit-bill.dto.js';
import { QueryBillsDto } from './dto/query-bills.dto.js';
import { PayBillDto } from './dto/pay-bill.dto.js';
import { UpdatePaymentDto } from './dto/update-payment.dto.js';
import { UpdateNotesDto } from './dto/update-notes.dto.js';

@UseGuards(JwtAuthGuard)
@Controller({ path: 'bills', version: '1' })
export class BillsController {
  constructor(private billsService: BillsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBillDto) {
    return this.billsService.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: QueryBillsDto) {
    return this.billsService.list(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.billsService.findOne(user, id);
  }

  @Patch(':id')
  edit(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: EditBillDto,
  ) {
    return this.billsService.edit(user, id, dto);
  }

  @Get(':id/timeline')
  getTimeline(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.billsService.getTimeline(user, id);
  }

  @Post(':id/pay')
  pay(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: PayBillDto,
  ) {
    return this.billsService.pay(user, id, dto);
  }

  @Patch(':id/payment')
  updatePayment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.billsService.updatePayment(user, id, dto);
  }

  @Patch(':id/notes')
  updateNotes(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateNotesDto,
  ) {
    return this.billsService.updateNotes(user, id, dto);
  }
}
