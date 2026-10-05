import { Module } from '@nestjs/common';
import { RecurringController } from './recurring.controller.js';
import { RecurringService } from './recurring.service.js';
import { RecurringWorker } from './recurring.worker.js';
import { BillEventService } from '../../common/services/bill-event.service.js';

@Module({
  controllers: [RecurringController],
  providers: [RecurringService, RecurringWorker, BillEventService],
  exports: [RecurringService],
})
export class RecurringModule {}
