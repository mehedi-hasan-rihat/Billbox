import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import type { CreateBillerDto } from './dto/create-biller.dto.js';
import type { UpdateBillerDto } from './dto/update-biller.dto.js';

@Injectable()
export class BillersService {
  constructor(private prisma: PrismaService) {}

  // Look up a BillBox user by BillBox ID — used to pre-fill biller form
  async lookupBillBoxUser(billBoxId: string) {
    const user = await this.prisma.user.findUnique({
      where: { billBoxId },
      select: { id: true, billBoxId: true, name: true, email: true },
    });
    if (!user) {
      throw new NotFoundException(`No BillBox account found with ID "${billBoxId}"`);
    }
    return user;
  }

  async create(owner: JwtPayload, dto: CreateBillerDto) {
    if (dto.billBoxId) {
      const exists = await this.prisma.user.findUnique({
        where: { billBoxId: dto.billBoxId },
      });
      if (!exists) {
        throw new BadRequestException(
          `No BillBox account found with ID "${dto.billBoxId}"`,
        );
      }
    }

    return this.prisma.biller.create({
      data: {
        userId: owner.sub,
        name: dto.name,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        address: dto.address ?? null,
        billBoxId: dto.billBoxId ?? null,
      },
    });
  }

  async findAll(owner: JwtPayload) {
    return this.prisma.biller.findMany({
      where: { userId: owner.sub },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(owner: JwtPayload, billerId: string) {
    const biller = await this.prisma.biller.findUnique({ where: { id: billerId } });
    if (!biller || biller.userId !== owner.sub) {
      throw new NotFoundException('Biller not found');
    }
    return biller;
  }

  async update(owner: JwtPayload, billerId: string, dto: UpdateBillerDto) {
    const biller = await this.prisma.biller.findUnique({ where: { id: billerId } });
    if (!biller || biller.userId !== owner.sub) {
      throw new NotFoundException('Biller not found');
    }

    if (dto.billBoxId) {
      const exists = await this.prisma.user.findUnique({
        where: { billBoxId: dto.billBoxId },
      });
      if (!exists) {
        throw new BadRequestException(
          `No BillBox account found with ID "${dto.billBoxId}"`,
        );
      }
    }

    return this.prisma.biller.update({
      where: { id: billerId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.billBoxId !== undefined && { billBoxId: dto.billBoxId }),
      },
    });
  }

  async remove(owner: JwtPayload, billerId: string) {
    const biller = await this.prisma.biller.findUnique({ where: { id: billerId } });
    if (!biller || biller.userId !== owner.sub) {
      throw new NotFoundException('Biller not found');
    }
    await this.prisma.biller.delete({ where: { id: billerId } });
    return { deleted: true };
  }
}
