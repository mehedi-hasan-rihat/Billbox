import { Module } from '@nestjs/common';
import { BillersController } from './billers.controller.js';
import { BillersService } from './billers.service.js';

@Module({
  controllers: [BillersController],
  providers: [BillersService],
  exports: [BillersService],
})
export class BillersModule {}
