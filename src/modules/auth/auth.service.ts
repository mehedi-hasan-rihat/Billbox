import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(
        `An account with email "${dto.email}" already exists`,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const billBoxId = this.generateBillBoxId();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        billBoxId,
        name: dto.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        billBoxId: true,
      },
    });

    const token = await this.generateToken({
      sub: user.id,
      email: user.email,
      billBoxId: user.billBoxId,
    });

    this.logger.log(`User registered: ${user.email} (BillBox ID: ${billBoxId})`);

    return {
      access_token: token,
      user,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = await this.generateToken({
      sub: user.id,
      email: user.email,
      billBoxId: user.billBoxId,
    });

    this.logger.log(`User logged in: ${user.email}`);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        billBoxId: user.billBoxId,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        billBoxId: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return user;
  }

  private async generateToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.sign(
      { sub: payload.sub, email: payload.email, billBoxId: payload.billBoxId },
      {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.expiresIn') ?? '24h',
      } as any,
    );
  }

  private generateBillBoxId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments: string[] = [];
    for (let s = 0; s < 3; s++) {
      let segment = '';
      for (let i = 0; i < 4; i++) {
        segment += chars[Math.floor(Math.random() * chars.length)];
      }
      segments.push(segment);
    }
    return `BB-${segments.join('-')}`;
  }
}
