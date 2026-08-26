import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class SubmitAssessmentDto {
  @ApiProperty({
    description: 'Assessment qualification step name',
    enum: ['requirements', 'personality_test', 'online_interview', 'shortlisted'],
  })
  @IsIn(['requirements', 'personality_test', 'online_interview', 'shortlisted'])
  step: 'requirements' | 'personality_test' | 'online_interview' | 'shortlisted';

  @ApiPropertyOptional({ description: 'Array of completed requirement checklist item identifiers' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  completedItems?: string[];

  @ApiPropertyOptional({ description: 'Key-value map of assessment answer values' })
  @IsOptional()
  @IsObject()
  answers?: Record<string, any>;
}
