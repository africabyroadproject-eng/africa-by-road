import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class StartCycleDto {
  @ApiProperty({
    description: 'Name for the voting cycle (e.g. "Week 3 Voting", "Semi-Finals")',
    example: 'Week 3 Voting',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
