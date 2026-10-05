import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { InboxService } from './inbox.service.js';
import { SendBillDto } from './dto/send-bill.dto.js';
import { ConfirmBillDto } from './dto/confirm-bill.dto.js';

@UseGuards(JwtAuthGuard)
@Controller({ path: 'inbox', version: '1' })
export class InboxController {
  constructor(private inboxService: InboxService) {}

  @Post('send')
  send(@CurrentUser() user: JwtPayload, @Body() dto: SendBillDto) {
    return this.inboxService.sendBill(user, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.inboxService.listInbox(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.inboxService.getBill(user, id);
  }

  @Post(':id/confirm')
  confirm(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ConfirmBillDto,
  ) {
    return this.inboxService.confirmBill(user, id, dto);
  }
}
