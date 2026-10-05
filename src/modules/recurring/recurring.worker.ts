import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurringService } from './recurring.service.js';

@Injectable()
export class RecurringWorker {
  private readonly logger = new Logger(RecurringWorker.name);

  constructor(private recurringService: RecurringService) {}

  // Runs daily at 00:05 — generates all bills due today
  @Cron(CronExpression.EVERY_6_HOURS)
  async handleDailyGeneration() {
    this.logger.log('Running daily recurring bill generation');
    await this.recurringService.generateDue();
  }
}
