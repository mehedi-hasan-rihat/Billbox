import { Module } from '@nestjs/common';
import { InboxController } from './inbox.controller.js';
import { InboxService } from './inbox.service.js';
import { BillEventService } from '../../common/services/bill-event.service.js';

@Module({
  controllers: [InboxController],
  providers: [InboxService, BillEventService],
  exports: [InboxService],
})
export class InboxModule {}
