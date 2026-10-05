import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { BillEventType } from '../../generated/prisma/enums.js';

@Injectable()
export class BillEventService {
  constructor(private prisma: PrismaService) {}

  async record(
    billId: string,
    type: BillEventType,
    actorId: string | null,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.billEvent.create({
      data: {
        billId,
        type,
        actorId: actorId ?? null,
        ...(metadata !== undefined && { metadata }),
      },
    });
  }

  async getTimeline(billId: string) {
    return this.prisma.billEvent.findMany({
      where: { billId },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: {
          select: { id: true, email: true, name: true, billBoxId: true },
        },
      },
    });
  }
}
