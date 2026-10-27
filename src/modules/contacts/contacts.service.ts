import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import type { CreateContactDto } from './dto/create-contact.dto.js';
import type { UpdateContactDto } from './dto/update-contact.dto.js';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  // Look up a BillBox user by BillBox ID — used to pre-fill the contact form
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

  async create(owner: JwtPayload, dto: CreateContactDto) {
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

    return this.prisma.contact.create({
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
    return this.prisma.contact.findMany({
      where: { userId: owner.sub },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(owner: JwtPayload, contactId: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.userId !== owner.sub) {
      throw new NotFoundException('Contact not found');
    }
    return contact;
  }

  async update(owner: JwtPayload, contactId: string, dto: UpdateContactDto) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.userId !== owner.sub) {
      throw new NotFoundException('Contact not found');
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

    return this.prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.billBoxId !== undefined && { billBoxId: dto.billBoxId }),
      },
    });
  }

  async remove(owner: JwtPayload, contactId: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.userId !== owner.sub) {
      throw new NotFoundException('Contact not found');
    }
    await this.prisma.contact.delete({ where: { id: contactId } });
    return { deleted: true };
  }
}
