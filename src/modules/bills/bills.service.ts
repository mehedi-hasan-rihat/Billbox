import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { BillEventService } from '../../common/services/bill-event.service.js';
import { BillStatus, BillSource, BillEventType, BillDirection } from '../../generated/prisma/enums.js';
import {
  withComputedStatus,
  withComputedStatusMany,
} from '../../common/helpers/bill-status.helper.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import type { CreateBillDto } from './dto/create-bill.dto.js';
import type { EditBillDto } from './dto/edit-bill.dto.js';
import type { AddPaymentDto } from './dto/add-payment.dto.js';
import type { UpdatePaymentDto } from './dto/update-payment.dto.js';
import type { AddNoteDto } from './dto/add-note.dto.js';
import type { UpdateNoteDto } from './dto/update-note.dto.js';
import type { QueryBillsDto } from './dto/query-bills.dto.js';

// Standard include — always load payments + attachments + contact
const BILL_INCLUDE = {
  attachments: true,
  contact: true,
  payments: { orderBy: { paidOn: 'asc' as const } },
} satisfies Prisma.BillInclude;

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);

  constructor(
    private prisma: PrismaService,
    private billEventService: BillEventService,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Re-derives bill status from sum of payments vs bill amount. */
  private deriveStatus(
    billAmount: Decimal,
    payments: { amount: Decimal }[],
  ): BillStatus {
    const total = payments.reduce((s, p) => s + Number(p.amount), 0);
    if (total <= 0) return BillStatus.UNPAID;
    if (total < Number(billAmount)) return BillStatus.PARTIALLY_PAID;
    return BillStatus.PAID;
  }

  private async assertBillOwner(user: JwtPayload, billId: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
      include: BILL_INCLUDE,
    });
    if (!bill || bill.userId !== user.sub) throw new NotFoundException('Bill not found');
    return bill;
  }

  // ── Bills CRUD ─────────────────────────────────────────────────────────────

  async create(user: JwtPayload, dto: CreateBillDto) {
    if (dto.contactId) {
      const contact = await this.prisma.contact.findUnique({ where: { id: dto.contactId } });
      if (!contact || contact.userId !== user.sub) throw new NotFoundException('Contact not found');
    }

    const bill = await this.prisma.bill.create({
      data: {
        userId: user.sub,
        source: BillSource.MANUAL,
        name: dto.name,
        category: dto.category,
        amount: new Decimal(dto.amount),
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.note ? [dto.note] : [],
        contactId: dto.contactId ?? null,
        direction: dto.direction ?? BillDirection.OUTGOING,
        status: BillStatus.UNPAID,
      },
      include: BILL_INCLUDE,
    });

    await this.billEventService.record(bill.id, BillEventType.CREATED, user.sub, {
      source: BillSource.MANUAL,
    });

    this.logger.log(`Bill created: "${bill.name}" by ${user.sub}`);
    return withComputedStatus(bill);
  }

  async findOne(user: JwtPayload, billId: string) {
    const bill = await this.assertBillOwner(user, billId);
    return withComputedStatus(bill);
  }

  async getTimeline(user: JwtPayload, billId: string) {
    const bill = await this.prisma.bill.findUnique({ where: { id: billId } });
    if (!bill || bill.userId !== user.sub) throw new NotFoundException('Bill not found');
    return this.billEventService.getTimeline(billId);
  }

  async edit(user: JwtPayload, billId: string, dto: EditBillDto) {
    const bill = await this.assertBillOwner(user, billId);

    if (dto.contactId) {
      const contact = await this.prisma.contact.findUnique({ where: { id: dto.contactId } });
      if (!contact || contact.userId !== user.sub) throw new NotFoundException('Contact not found');
    }

    const updated = await this.prisma.bill.update({
      where: { id: billId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.amount !== undefined && { amount: new Decimal(dto.amount) }),
        ...(dto.issueDate !== undefined && { issueDate: dto.issueDate ? new Date(dto.issueDate) : null }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.contactId !== undefined && { contactId: dto.contactId ?? null }),
        ...(dto.direction !== undefined && { direction: dto.direction }),
      },
      include: BILL_INCLUDE,
    });

    await this.billEventService.record(bill.id, BillEventType.EDITED, user.sub, {
      fields: Object.keys(dto),
    });

    return withComputedStatus(updated);
  }

  async addNote(user: JwtPayload, billId: string, dto: AddNoteDto) {
    await this.assertBillOwner(user, billId);

    const updated = await this.prisma.bill.update({
      where: { id: billId },
      data: { notes: { push: dto.note } },
      include: BILL_INCLUDE,
    });

    await this.billEventService.record(billId, BillEventType.NOTE_ADDED, user.sub);
    return withComputedStatus(updated);
  }

  async updateNote(user: JwtPayload, billId: string, noteIndex: number, dto: UpdateNoteDto) {
    const bill = await this.assertBillOwner(user, billId);

    if (noteIndex < 0 || noteIndex >= bill.notes.length) {
      throw new NotFoundException('Note not found');
    }

    const newNotes = [...bill.notes];
    newNotes[noteIndex] = dto.note;

    const updated = await this.prisma.bill.update({
      where: { id: billId },
      data: { notes: { set: newNotes } },
      include: BILL_INCLUDE,
    });

    await this.billEventService.record(billId, BillEventType.NOTE_UPDATED, user.sub, {
      noteIndex,
    });
    return withComputedStatus(updated);
  }

  async deleteNote(user: JwtPayload, billId: string, noteIndex: number) {
    const bill = await this.assertBillOwner(user, billId);

    if (noteIndex < 0 || noteIndex >= bill.notes.length) {
      throw new NotFoundException('Note not found');
    }

    const newNotes = bill.notes.filter((_, i) => i !== noteIndex);

    const updated = await this.prisma.bill.update({
      where: { id: billId },
      data: { notes: { set: newNotes } },
      include: BILL_INCLUDE,
    });

    await this.billEventService.record(billId, BillEventType.NOTE_DELETED, user.sub, {
      noteIndex,
    });
    return withComputedStatus(updated);
  }

  // ── Payments ───────────────────────────────────────────────────────────────

  async addPayment(user: JwtPayload, billId: string, dto: AddPaymentDto) {
    const bill = await this.assertBillOwner(user, billId);

    if (bill.status === BillStatus.INBOX) {
      throw new BadRequestException('Confirm the bill before recording payments');
    }

    const paymentAmount = new Decimal(dto.amount);
    if (paymentAmount.lte(0)) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    // Create payment + recompute bill status in a transaction
    const [payment, updatedBill] = await this.prisma.$transaction(async (tx) => {
      const pmt = await tx.billPayment.create({
        data: {
          billId,
          amount: paymentAmount,
          paidOn: new Date(dto.paidOn),
          paymentMethod: dto.paymentMethod ?? null,
          paymentReference: dto.paymentReference ?? null,
          note: dto.note ?? null,
        },
      });

      // Fetch fresh payments to derive new status
      const allPayments = await tx.billPayment.findMany({ where: { billId } });
      const newStatus = this.deriveStatus(bill.amount, allPayments);

      const updated = await tx.bill.update({
        where: { id: billId },
        data: { status: newStatus },
        include: BILL_INCLUDE,
      });

      return [pmt, updated];
    });

    await this.billEventService.record(billId, BillEventType.PAYMENT_ADDED, user.sub, {
      paymentId: payment.id,
      amount: dto.amount,
      paidOn: dto.paidOn,
      method: dto.paymentMethod ?? null,
    });

    if (updatedBill.status === BillStatus.PAID) {
      await this.billEventService.record(billId, BillEventType.FULLY_PAID, user.sub, {
        totalPaid: updatedBill.payments.reduce((s, p) => s + Number(p.amount), 0).toFixed(2),
      });
    }

    this.logger.log(`Payment added to bill "${bill.name}" — status now ${updatedBill.status}`);
    return withComputedStatus(updatedBill);
  }

  async listPayments(user: JwtPayload, billId: string) {
    await this.assertBillOwner(user, billId);
    return this.prisma.billPayment.findMany({
      where: { billId },
      orderBy: { paidOn: 'asc' },
    });
  }

  async updatePayment(
    user: JwtPayload,
    billId: string,
    paymentId: string,
    dto: UpdatePaymentDto,
  ) {
    const bill = await this.assertBillOwner(user, billId);

    const payment = await this.prisma.billPayment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.billId !== billId) {
      throw new NotFoundException('Payment not found');
    }

    const [, updatedBill] = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.billPayment.update({
        where: { id: paymentId },
        data: {
          ...(dto.amount !== undefined && { amount: new Decimal(dto.amount) }),
          ...(dto.paidOn !== undefined && { paidOn: new Date(dto.paidOn) }),
          ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod }),
          ...(dto.paymentReference !== undefined && { paymentReference: dto.paymentReference }),
          ...(dto.note !== undefined && { note: dto.note }),
        },
      });

      const allPayments = await tx.billPayment.findMany({ where: { billId } });
      const newStatus = this.deriveStatus(bill.amount, allPayments);

      const updBill = await tx.bill.update({
        where: { id: billId },
        data: { status: newStatus },
        include: BILL_INCLUDE,
      });

      return [updated, updBill];
    });

    await this.billEventService.record(billId, BillEventType.PAYMENT_UPDATED, user.sub, {
      paymentId,
      fields: Object.keys(dto),
    });

    return withComputedStatus(updatedBill);
  }

  async deletePayment(user: JwtPayload, billId: string, paymentId: string) {
    const bill = await this.assertBillOwner(user, billId);

    const payment = await this.prisma.billPayment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.billId !== billId) {
      throw new NotFoundException('Payment not found');
    }

    const updatedBill = await this.prisma.$transaction(async (tx) => {
      await tx.billPayment.delete({ where: { id: paymentId } });

      const allPayments = await tx.billPayment.findMany({ where: { billId } });
      const newStatus = this.deriveStatus(bill.amount, allPayments);

      return tx.bill.update({
        where: { id: billId },
        data: { status: newStatus },
        include: BILL_INCLUDE,
      });
    });

    await this.billEventService.record(billId, BillEventType.PAYMENT_DELETED, user.sub, {
      paymentId,
      amount: payment.amount.toString(),
    });

    return withComputedStatus(updatedBill);
  }

  // ── List / query ───────────────────────────────────────────────────────────

  async list(user: JwtPayload, dto: QueryBillsDto) {
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 20;
    const skip  = (page - 1) * limit;
    const sort  = dto.sort  ?? 'createdAt';
    const order = dto.order ?? 'desc';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let statusWhere: Prisma.BillWhereInput = {};
    if (dto.status) {
      switch (dto.status) {
        case 'UPCOMING':
          statusWhere = { status: BillStatus.UNPAID, dueDate: { gt: today } };
          break;
        case 'DUE_TODAY':
          statusWhere = { status: BillStatus.UNPAID, dueDate: { gte: today, lt: tomorrow } };
          break;
        case 'OVERDUE':
          statusWhere = { status: BillStatus.UNPAID, dueDate: { lt: today } };
          break;
        case 'UNPAID':
          statusWhere = { status: BillStatus.UNPAID, dueDate: null };
          break;
        default:
          statusWhere = { status: dto.status as BillStatus };
      }
    }

    const where: Prisma.BillWhereInput = {
      userId: user.sub,
      ...statusWhere,
      ...(dto.search && {
        OR: [
          { name: { contains: dto.search, mode: 'insensitive' } },
          { contact: { name: { contains: dto.search, mode: 'insensitive' } } },
        ],
      }),
      ...(dto.category && { category: dto.category }),
      ...(dto.source && { source: dto.source }),
      ...(dto.type && { type: dto.type }),
      ...(dto.direction && { direction: dto.direction }),
      ...(dto.issueDateFrom || dto.issueDateTo ? {
        issueDate: {
          ...(dto.issueDateFrom && { gte: new Date(dto.issueDateFrom) }),
          ...(dto.issueDateTo   && { lte: new Date(dto.issueDateTo) }),
        },
      } : {}),
      ...(dto.dueDateFrom || dto.dueDateTo ? {
        dueDate: {
          ...(dto.dueDateFrom && { gte: new Date(dto.dueDateFrom) }),
          ...(dto.dueDateTo   && { lte: new Date(dto.dueDateTo) }),
        },
      } : {}),
    };

    const [bills, total] = await this.prisma.$transaction([
      this.prisma.bill.findMany({
        where,
        orderBy: [{ [sort]: order }, { id: 'asc' }],
        skip,
        take: limit,
        include: BILL_INCLUDE,
      }),
      this.prisma.bill.count({ where }),
    ]);

    return {
      data: withComputedStatusMany(bills),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
