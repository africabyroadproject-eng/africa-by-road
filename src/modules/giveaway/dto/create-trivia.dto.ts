import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateTriviaDto {
  @ApiProperty({ description: 'The trivia question text', example: 'What is the longest river in Africa?' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  question: string;

  @ApiProperty({
    description: 'Array of answer options (2–6 choices)',
    example: ['Nile', 'Congo', 'Niger', 'Zambezi'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  options: string[];

  @ApiProperty({ description: 'Zero-based index of the correct answer in the options array', example: 0 })
  @IsInt()
  @Min(0)
  correctAnswer: number;

  @ApiPropertyOptional({ description: 'Category tag for grouping', example: 'geography', default: 'general' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Start of the active answering window (ISO 8601)', example: '2026-09-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ description: 'End of the active answering window (ISO 8601)', example: '2026-09-07T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;
}
