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
import { BillersService } from './billers.service.js';
import { CreateBillerDto } from './dto/create-biller.dto.js';
import { UpdateBillerDto } from './dto/update-biller.dto.js';
import { LookupBillerDto } from './dto/lookup-biller.dto.js';

@UseGuards(JwtAuthGuard)
@Controller({ path: 'billers', version: '1' })
export class BillersController {
  constructor(private billersService: BillersService) {}

  // Resolve a BillBox user before creating a biller — returns their public info
  @Get('lookup')
  lookup(@Query() query: LookupBillerDto) {
    return this.billersService.lookupBillBoxUser(query.billBoxId);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBillerDto) {
    return this.billersService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.billersService.findAll(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.billersService.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBillerDto,
  ) {
    return this.billersService.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.billersService.remove(user, id);
  }
}
