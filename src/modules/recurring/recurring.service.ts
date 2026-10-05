import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaService } from '../../database/prisma.service.js';
import { BillEventService } from '../../common/services/bill-event.service.js';
import {
  BillSource,
  BillStatus,
  BillType,
  BillEventType,
  RecurringStatus,
} from '../../generated/prisma/enums.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import type { CreateRecurringRuleDto } from './dto/create-recurring-rule.dto.js';
import type { UpdateRecurringRuleDto } from './dto/update-recurring-rule.dto.js';
import { nextDueDate, generateAtFromDueDate } from './recurring.helper.js';

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(
    private prisma: PrismaService,
    private billEventService: BillEventService,
  ) {}

  async create(user: JwtPayload, dto: CreateRecurringRuleDto) {
    if (dto.senderBillerId) {
      const biller = await this.prisma.biller.findUnique({ where: { id: dto.senderBillerId } });
      if (!biller || biller.userId !== user.sub) throw new NotFoundException('Biller not found');
    }

    const generateDaysBefore = dto.generateDaysBefore ?? 5;
    const startFrom = dto.startAt ? new Date(dto.startAt) : new Date();
    const dueDate = nextDueDate(dto.frequency, dto.dayRule, startFrom);
    const nextGenerateAt = generateAtFromDueDate(dueDate, generateDaysBefore);

    return this.prisma.recurringRule.create({
      data: {
        userId: user.sub,
        name: dto.name,
        category: dto.category,
        amount: new Decimal(dto.amount),
        note: dto.note ?? null,
        senderBillerId: dto.senderBillerId ?? null,
        frequency: dto.frequency,
        dayRule: dto.dayRule,
        generateDaysBefore,
        status: RecurringStatus.ACTIVE,
        nextGenerateAt,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });
  }

  async findAll(user: JwtPayload) {
    return this.prisma.recurringRule.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: JwtPayload, ruleId: string) {
    const rule = await this.prisma.recurringRule.findUnique({ where: { id: ruleId } });
    if (!rule || rule.userId !== user.sub) throw new NotFoundException('Recurring rule not found');
    return rule;
  }

  async update(user: JwtPayload, ruleId: string, dto: UpdateRecurringRuleDto) {
    const rule = await this.prisma.recurringRule.findUnique({ where: { id: ruleId } });
    if (!rule || rule.userId !== user.sub) throw new NotFoundException('Recurring rule not found');

    if (dto.senderBillerId) {
      const biller = await this.prisma.biller.findUnique({ where: { id: dto.senderBillerId } });
      if (!biller || biller.userId !== user.sub) throw new NotFoundException('Biller not found');
    }

    return this.prisma.recurringRule.update({
      where: { id: ruleId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.amount !== undefined && { amount: new Decimal(dto.amount) }),
        ...(dto.note !== undefined && { note: dto.note }),
        ...(dto.senderBillerId !== undefined && { senderBillerId: dto.senderBillerId }),
        ...(dto.dayRule !== undefined && { dayRule: dto.dayRule }),
        ...(dto.generateDaysBefore !== undefined && { generateDaysBefore: dto.generateDaysBefore }),
        ...(dto.endsAt !== undefined && { endsAt: dto.endsAt ? new Date(dto.endsAt) : null }),
      },
    });
  }

  async pause(user: JwtPayload, ruleId: string) {
    const rule = await this.prisma.recurringRule.findUnique({ where: { id: ruleId } });
    if (!rule || rule.userId !== user.sub) throw new NotFoundException('Recurring rule not found');
    if (rule.status !== RecurringStatus.ACTIVE) {
      throw new BadRequestException(`Rule is ${rule.status}, only ACTIVE rules can be paused`);
    }
    return this.prisma.recurringRule.update({
      where: { id: ruleId },
      data: { status: RecurringStatus.PAUSED },
    });
  }

  async resume(user: JwtPayload, ruleId: string) {
    const rule = await this.prisma.recurringRule.findUnique({ where: { id: ruleId } });
    if (!rule || rule.userId !== user.sub) throw new NotFoundException('Recurring rule not found');
    if (rule.status !== RecurringStatus.PAUSED) {
      throw new BadRequestException(`Rule is ${rule.status}, only PAUSED rules can be resumed`);
    }
    return this.prisma.recurringRule.update({
      where: { id: ruleId },
      data: { status: RecurringStatus.ACTIVE },
    });
  }

  async stop(user: JwtPayload, ruleId: string) {
    const rule = await this.prisma.recurringRule.findUnique({ where: { id: ruleId } });
    if (!rule || rule.userId !== user.sub) throw new NotFoundException('Recurring rule not found');
    if (rule.status === RecurringStatus.STOPPED) {
      throw new BadRequestException('Rule is already stopped');
    }
    return this.prisma.recurringRule.update({
      where: { id: ruleId },
      data: { status: RecurringStatus.STOPPED },
    });
  }

  /**
   * Called by the scheduler. Generates all bills due for generation now.
   * Idempotent: uses nextGenerateAt as a lock — only generates once per cycle.
   */
  async generateDue() {
    const now = new Date();

    const dueRules = await this.prisma.recurringRule.findMany({
      where: {
        status: RecurringStatus.ACTIVE,
        nextGenerateAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
    });

    this.logger.log(`Recurring generation: ${dueRules.length} rule(s) due`);

    for (const rule of dueRules) {
      try {
        // Compute the due date for this cycle
        const dueDate = nextDueDate(rule.frequency, rule.dayRule, now);

        await this.prisma.$transaction(async (tx) => {
          const bill = await tx.bill.create({
            data: {
              userId: rule.userId,
              source: BillSource.MANUAL,
              type: BillType.RECURRING,
              name: rule.name,
              category: rule.category,
              amount: rule.amount,
              dueDate,
              note: rule.note ?? null,
              senderBillerId: rule.senderBillerId ?? null,
              status: BillStatus.UNPAID,
              recurringRuleId: rule.id,
            },
          });

          // Advance nextGenerateAt to the next cycle
          const nextDue = nextDueDate(rule.frequency, rule.dayRule, dueDate);
          const nextGenerate = generateAtFromDueDate(nextDue, rule.generateDaysBefore);

          await tx.recurringRule.update({
            where: { id: rule.id },
            data: { nextGenerateAt: nextGenerate },
          });

          await this.billEventService.record(
            bill.id,
            BillEventType.RECURRING_GENERATED,
            null,
            { recurringRuleId: rule.id, dueDate: dueDate.toISOString() },
          );
        });

        this.logger.log(`Generated bill for rule "${rule.name}" (${rule.id})`);
      } catch (err) {
        this.logger.error(`Failed to generate bill for rule ${rule.id}`, err);
      }
    }
  }
}
