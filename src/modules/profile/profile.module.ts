import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { DocumentStorageService } from './document-storage.service';

@Module({
  imports: [AuthModule],
  controllers: [ProfileController],
  providers: [ProfileService, DocumentStorageService],
  exports: [DocumentStorageService],
})
export class ProfileModule {}
