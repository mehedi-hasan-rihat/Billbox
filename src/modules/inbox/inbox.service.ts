import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaService } from '../../database/prisma.service.js';
import { BillEventService } from '../../common/services/bill-event.service.js';
import { BillStatus, BillSource, BillEventType } from '../../generated/prisma/enums.js';
import {
  withComputedStatus,
  withComputedStatusMany,
} from '../../common/helpers/bill-status.helper.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import type { SendBillDto } from './dto/send-bill.dto.js';
import type { ConfirmBillDto } from './dto/confirm-bill.dto.js';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    private prisma: PrismaService,
    private billEventService: BillEventService,
  ) {}

  async sendBill(sender: JwtPayload, dto: SendBillDto) {
    const recipient = await this.prisma.user.findUnique({
      where: { billBoxId: dto.recipientBillBoxId },
    });
    if (!recipient) {
      throw new NotFoundException(
        `No BillBox account found with ID "${dto.recipientBillBoxId}"`,
      );
    }

    if (recipient.id === sender.sub) {
      throw new BadRequestException('You cannot send a bill to yourself');
    }

    const now = new Date();

    const bill = await this.prisma.bill.create({
      data: {
        userId: recipient.id,
        source: BillSource.INBOX,
        name: dto.name,
        category: dto.category,
        amount: new Decimal(String(dto.amount)),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        note: dto.note ?? null,
        status: BillStatus.INBOX,
        confirmedStatus: dto.confirmedStatus ?? BillStatus.UNPAID,
        receiverId: recipient.id,
        senderId: sender.sub,
        sentAt: now,
        receivedAt: now,
      },
      include: { attachments: true, senderBiller: true },
    });

    // Record SENT from sender's perspective, RECEIVED from recipient's perspective
    await this.billEventService.record(bill.id, BillEventType.SENT, sender.sub, {
      to: dto.recipientBillBoxId,
    });
    await this.billEventService.record(bill.id, BillEventType.RECEIVED, null, {
      from: sender.billBoxId,
      receivedAt: now.toISOString(),
    });

    this.logger.log(`Bill "${bill.name}" sent by ${sender.email} → ${dto.recipientBillBoxId}`);
    return withComputedStatus(bill);
  }

  async listInbox(user: JwtPayload) {
    const bills = await this.prisma.bill.findMany({
      where: { userId: user.sub, status: BillStatus.INBOX },
      orderBy: { receivedAt: 'desc' },
      include: { attachments: true, senderBiller: true },
    });

    return withComputedStatusMany(bills);
  }

  async getBill(user: JwtPayload, billId: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
      include: { attachments: true, senderBiller: true },
    });

    if (!bill || bill.userId !== user.sub) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status !== BillStatus.INBOX) {
      throw new ForbiddenException('This bill is not in your inbox');
    }

    return withComputedStatus(bill);
  }

  async confirmBill(user: JwtPayload, billId: string, dto: ConfirmBillDto) {
    const bill = await this.prisma.bill.findUnique({ where: { id: billId } });

    if (!bill || bill.userId !== user.sub) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status !== BillStatus.INBOX) {
      throw new BadRequestException(
        `Only INBOX bills can be confirmed. Current status: ${bill.status}`,
      );
    }

    const targetStatus = bill.confirmedStatus ?? BillStatus.UNPAID;

    const updated = await this.prisma.bill.update({
      where: { id: billId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.category && { category: dto.category }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.note !== undefined && { note: dto.note }),
        status: targetStatus,
        confirmedAt: new Date(),
      },
      include: { attachments: true, senderBiller: true },
    });

    await this.billEventService.record(bill.id, BillEventType.CONFIRMED, user.sub, {
      from: BillStatus.INBOX,
      to: targetStatus,
    });

    this.logger.log(`Bill "${updated.name}" confirmed by ${user.sub} → ${updated.status}`);
    return withComputedStatus(updated);
  }
}
