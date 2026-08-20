import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export type StageType = 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4' | 'Final';

export class MoveContestantStageDto {
  @ApiProperty({
    description: 'Target competition stage',
    enum: ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Final'],
    example: 'Stage 2',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Final'])
  stage: StageType;

  @ApiPropertyOptional({
    description: 'Reason for moving the contestant to this stage',
    example: 'Passed Stage 1 audition and voting criteria.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
