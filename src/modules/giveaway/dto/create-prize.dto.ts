import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePrizeDto {
  @ApiProperty({ description: 'Prize display name', example: 'Travel Backpack' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Prize description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Prize image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ description: 'Available stock quantity', example: 50 })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: 'Probability weight (1–100). Higher = more likely', example: 10 })
  @IsInt()
  @Min(1)
  @Max(100)
  weight: number;

  @ApiProperty({ description: 'Wheel slot position (1–10)', example: 1 })
  @IsInt()
  @Min(1)
  @Max(10)
  position: number;
}
