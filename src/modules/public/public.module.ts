import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { ContentService } from './content.service';
import { PublicController } from './public.controller';

@Module({
  imports: [PaymentsModule],
  controllers: [PublicController],
  providers: [ContentService],
})
export class PublicModule {}
