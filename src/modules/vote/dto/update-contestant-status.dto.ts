import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export type ContestantStatusType = 'pending' | 'active' | 'eliminated' | 'winner';

export class UpdateContestantStatusDto {
  @ApiProperty({
    description: 'Updated contestant status',
    enum: ['pending', 'active', 'eliminated', 'winner'],
    example: 'active',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['pending', 'active', 'eliminated', 'winner'])
  status: ContestantStatusType;

  @ApiPropertyOptional({
    description: 'Reason for status update',
    example: 'Approved after identity verification.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
