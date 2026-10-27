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
import { ContactsService } from './contacts.service.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { UpdateContactDto } from './dto/update-contact.dto.js';
import { LookupContactDto } from './dto/lookup-contact.dto.js';

@UseGuards(JwtAuthGuard)
@Controller({ path: 'contacts', version: '1' })
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  // Resolve a BillBox user before creating a contact — returns their public info
  @Get('lookup')
  lookup(@Query() query: LookupContactDto) {
    return this.contactsService.lookupBillBoxUser(query.billBoxId);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateContactDto) {
    return this.contactsService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.contactsService.findAll(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.contactsService.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.contactsService.remove(user, id);
  }
}
