import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateTriviaDto {
  @ApiPropertyOptional({ description: 'The trivia question text' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  question?: string;

  @ApiPropertyOptional({ description: 'Array of answer options', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ description: 'Zero-based index of the correct answer' })
  @IsOptional()
  @IsInt()
  @Min(0)
  correctAnswer?: number;

  @ApiPropertyOptional({ description: 'Category tag for grouping' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Start of the active answering window (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ description: 'End of the active answering window (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional({ description: 'Reason for this update (used in change logging when correct answer changes)' })
  @IsOptional()
  @IsString()
  reason?: string;
}
