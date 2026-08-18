import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class EliminateContestantDto {
  @ApiProperty({
    description: 'The ID of the contestant to eliminate',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsMongoId()
  @IsNotEmpty()
  contestantId: string;

  @ApiPropertyOptional({
    description: 'Optional reason for the elimination',
    example: 'Lowest votes in Week 3 cycle',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
