import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({ enum: ['governmentId', 'proofOfAddress', 'medicalRecords'] })
  @IsIn(['governmentId', 'proofOfAddress', 'medicalRecords'])
  type: 'governmentId' | 'proofOfAddress' | 'medicalRecords';

}
