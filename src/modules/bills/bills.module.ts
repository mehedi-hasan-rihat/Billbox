import { Module } from '@nestjs/common';
import { BillsController } from './bills.controller.js';
import { BillsService } from './bills.service.js';
import { BillEventService } from '../../common/services/bill-event.service.js';

@Module({
  controllers: [BillsController],
  providers: [BillsService, BillEventService],
  exports: [BillsService],
})
export class BillsModule {}
