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
import { BillStatus, BillSource, BillEventType } from '../../generated/prisma/enums.js';
import {
  withComputedStatus,
  withComputedStatusMany,
} from '../../common/helpers/bill-status.helper.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import type { CreateBillDto } from './dto/create-bill.dto.js';
import type { EditBillDto } from './dto/edit-bill.dto.js';
import type { PayBillDto } from './dto/pay-bill.dto.js';
import type { UpdatePaymentDto } from './dto/update-payment.dto.js';
import type { UpdateNotesDto } from './dto/update-notes.dto.js';
import type { QueryBillsDto } from './dto/query-bills.dto.js';

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);

  constructor(
    private prisma: PrismaService,
    private billEventService: BillEventService,
  ) {}

  async create(user: JwtPayload, dto: CreateBillDto) {
    const initialStatus = dto.status ?? BillStatus.UNPAID;

    if (initialStatus === BillStatus.PAID && !dto.paidAt) {
      throw new BadRequestException('paidAt is required when creating a bill as PAID');
    }

    // Verify senderBiller belongs to this user if provided
    if (dto.senderBillerId) {
      const biller = await this.prisma.biller.findUnique({
        where: { id: dto.senderBillerId },
      });
      if (!biller || biller.userId !== user.sub) {
        throw new NotFoundException('Biller not found');
      }
    }

    const bill = await this.prisma.bill.create({
      data: {
        userId: user.sub,
        source: BillSource.MANUAL,
        name: dto.name,
        category: dto.category,
        amount: new Decimal(dto.amount),
        billDate: dto.billDate ? new Date(dto.billDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        note: dto.note ?? null,
        senderBillerId: dto.senderBillerId ?? null,
        status: initialStatus,
        ...(initialStatus === BillStatus.PAID && {
          paidAt: new Date(dto.paidAt!),
          paidAmount: dto.paidAmount ? new Decimal(dto.paidAmount) : null,
          paymentMethod: dto.paymentMethod ?? null,
          paymentReference: dto.paymentReference ?? null,
        }),
      },
      include: { attachments: true, senderBiller: true },
    });

    await this.billEventService.record(bill.id, BillEventType.CREATED, user.sub, {
      status: initialStatus,
      source: BillSource.MANUAL,
    });

    if (initialStatus === BillStatus.PAID) {
      await this.billEventService.record(bill.id, BillEventType.PAID, user.sub, {
        paidAt: dto.paidAt,
        method: dto.paymentMethod ?? null,
      });
    }

    this.logger.log(`Bill created: "${bill.name}" by ${user.sub}`);
    return withComputedStatus(bill);
  }

  async findOne(user: JwtPayload, billId: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
      include: { attachments: true, senderBiller: true },
    });

    if (!bill || bill.userId !== user.sub) {
      throw new NotFoundException('Bill not found');
    }

    return withComputedStatus(bill);
  }

  async getTimeline(user: JwtPayload, billId: string) {
    const bill = await this.prisma.bill.findUnique({ where: { id: billId } });

    if (!bill || bill.userId !== user.sub) {
      throw new NotFoundException('Bill not found');
    }

    return this.billEventService.getTimeline(billId);
  }

  async edit(user: JwtPayload, billId: string, dto: EditBillDto) {
    const bill = await this.prisma.bill.findUnique({ where: { id: billId } });

    if (!bill || bill.userId !== user.sub) {
      throw new NotFoundException('Bill not found');
    }

    if (dto.senderBillerId) {
      const biller = await this.prisma.biller.findUnique({
        where: { id: dto.senderBillerId },
      });
      if (!biller || biller.userId !== user.sub) {
        throw new NotFoundException('Biller not found');
      }
    }

    const updated = await this.prisma.bill.update({
      where: { id: billId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.amount !== undefined && { amount: new Decimal(dto.amount) }),
        ...(dto.billDate !== undefined && { billDate: dto.billDate ? new Date(dto.billDate) : null }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.senderBillerId !== undefined && { senderBillerId: dto.senderBillerId ?? null }),
      },
      include: { attachments: true, senderBiller: true },
    });

    await this.billEventService.record(bill.id, BillEventType.EDITED, user.sub, {
      fields: Object.keys(dto),
    });

    return withComputedStatus(updated);
  }

  async pay(user: JwtPayload, billId: string, dto: PayBillDto) {
    const bill = await this.prisma.bill.findUnique({ where: { id: billId } });

    if (!bill || bill.userId !== user.sub) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status === BillStatus.PAID) {
      throw new BadRequestException('Bill is already paid');
    }

    if (bill.status !== BillStatus.UNPAID) {
      throw new BadRequestException(
        `Only UNPAID bills can be marked as paid. Current status: ${bill.status}`,
      );
    }

    const updated = await this.prisma.bill.update({
      where: { id: billId },
      data: {
        status: BillStatus.PAID,
        paidAt: new Date(dto.paidAt),
        paidAmount: dto.paidAmount ? new Decimal(dto.paidAmount) : null,
        paymentMethod: dto.paymentMethod ?? null,
        paymentReference: dto.paymentReference ?? null,
      },
      include: { attachments: true, senderBiller: true },
    });

    await this.billEventService.record(bill.id, BillEventType.PAID, user.sub, {
      paidAt: dto.paidAt,
      amount: dto.paidAmount ?? null,
      method: dto.paymentMethod ?? null,
      reference: dto.paymentReference ?? null,
    });

    this.logger.log(`Bill "${updated.name}" marked PAID by ${user.sub}`);
    return withComputedStatus(updated);
  }

  async updatePayment(user: JwtPayload, billId: string, dto: UpdatePaymentDto) {
    const bill = await this.prisma.bill.findUnique({ where: { id: billId } });

    if (!bill || bill.userId !== user.sub) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status !== BillStatus.PAID) {
      throw new BadRequestException('Payment metadata can only be updated on a PAID bill');
    }

    const updated = await this.prisma.bill.update({
      where: { id: billId },
      data: {
        ...(dto.paidAt !== undefined && { paidAt: new Date(dto.paidAt) }),
        ...(dto.paidAmount !== undefined && { paidAmount: dto.paidAmount ? new Decimal(dto.paidAmount) : null }),
        ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod }),
        ...(dto.paymentReference !== undefined && { paymentReference: dto.paymentReference }),
      },
      include: { attachments: true, senderBiller: true },
    });

    await this.billEventService.record(bill.id, BillEventType.PAYMENT_UPDATED, user.sub, {
      fields: Object.keys(dto),
    });

    return withComputedStatus(updated);
  }

  async updateNotes(user: JwtPayload, billId: string, dto: UpdateNotesDto) {
    const bill = await this.prisma.bill.findUnique({ where: { id: billId } });

    if (!bill || bill.userId !== user.sub) {
      throw new NotFoundException('Bill not found');
    }

    const updated = await this.prisma.bill.update({
      where: { id: billId },
      data: { note: dto.note ?? null },
      include: { attachments: true, senderBiller: true },
    });

    await this.billEventService.record(bill.id, BillEventType.NOTE_ADDED, user.sub);

    return withComputedStatus(updated);
  }

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

    // ── Status filter → translate computed statuses into DB conditions ──
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
          // bare UNPAID = unpaid with no due date (user explicitly wants no-date bills)
          statusWhere = { status: BillStatus.UNPAID, dueDate: null };
          break;
        default:
          // INBOX, PAID — direct DB status match
          statusWhere = { status: dto.status as BillStatus };
      }
    }

    const where: Prisma.BillWhereInput = {
      userId: user.sub,
      ...statusWhere,

      // Search across name and biller name
      ...(dto.search && {
        OR: [
          { name: { contains: dto.search, mode: 'insensitive' } },
          { senderBiller: { name: { contains: dto.search, mode: 'insensitive' } } },
        ],
      }),

      ...(dto.category && { category: dto.category }),
      ...(dto.source && { source: dto.source }),
      ...(dto.type && { type: dto.type }),

      // Bill date range
      ...(dto.billDateFrom || dto.billDateTo ? {
        billDate: {
          ...(dto.billDateFrom && { gte: new Date(dto.billDateFrom) }),
          ...(dto.billDateTo   && { lte: new Date(dto.billDateTo) }),
        },
      } : {}),

      // Due date range
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
        orderBy: [{ [sort]: order }, { id: 'asc' }], // secondary sort for determinism
        skip,
        take: limit,
        include: { attachments: true, senderBiller: true },
      }),
      this.prisma.bill.count({ where }),
    ]);

    return {
      data: withComputedStatusMany(bills),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listOwned(user: JwtPayload) {
    const bills = await this.prisma.bill.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      include: { attachments: true, senderBiller: true },
    });

    return withComputedStatusMany(bills);
  }
}
