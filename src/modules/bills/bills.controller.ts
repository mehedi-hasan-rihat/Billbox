import {
  Body,
  Controller,
  Delete,
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
import { AddPaymentDto } from './dto/add-payment.dto.js';
import { UpdatePaymentDto } from './dto/update-payment.dto.js';
import { AddNoteDto } from './dto/add-note.dto.js';
import { UpdateNoteDto } from './dto/update-note.dto.js';

@UseGuards(JwtAuthGuard)
@Controller({ path: 'bills', version: '1' })
export class BillsController {
  constructor(private billsService: BillsService) {}

  // ── Bills ──────────────────────────────────────────────────────────────────

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

  @Post(':id/notes')
  addNote(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AddNoteDto,
  ) {
    return this.billsService.addNote(user, id, dto);
  }

  @Patch(':id/notes/:noteIndex')
  updateNote(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('noteIndex') noteIndex: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.billsService.updateNote(user, id, Number(noteIndex), dto);
  }

  @Delete(':id/notes/:noteIndex')
  deleteNote(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('noteIndex') noteIndex: string,
  ) {
    return this.billsService.deleteNote(user, id, Number(noteIndex));
  }

  @Get(':id/timeline')
  getTimeline(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.billsService.getTimeline(user, id);
  }

  // ── Payments ───────────────────────────────────────────────────────────────

  @Post(':id/payments')
  addPayment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AddPaymentDto,
  ) {
    return this.billsService.addPayment(user, id, dto);
  }

  @Get(':id/payments')
  listPayments(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.billsService.listPayments(user, id);
  }

  @Patch(':id/payments/:paymentId')
  updatePayment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.billsService.updatePayment(user, id, paymentId, dto);
  }

  @Delete(':id/payments/:paymentId')
  deletePayment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.billsService.deletePayment(user, id, paymentId);
  }
}
