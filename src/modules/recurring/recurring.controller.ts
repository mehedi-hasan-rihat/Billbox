import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { RecurringService } from './recurring.service.js';
import { CreateRecurringRuleDto } from './dto/create-recurring-rule.dto.js';
import { UpdateRecurringRuleDto } from './dto/update-recurring-rule.dto.js';

@UseGuards(JwtAuthGuard)
@Controller({ path: 'recurring', version: '1' })
export class RecurringController {
  constructor(private recurringService: RecurringService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRecurringRuleDto) {
    return this.recurringService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.recurringService.findAll(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.recurringService.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringRuleDto,
  ) {
    return this.recurringService.update(user, id, dto);
  }

  @Post(':id/pause')
  pause(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.recurringService.pause(user, id);
  }

  @Post(':id/resume')
  resume(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.recurringService.resume(user, id);
  }

  @Post(':id/stop')
  stop(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.recurringService.stop(user, id);
  }
}
