import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdatePrizeDto {
  @ApiPropertyOptional({ description: 'Prize display name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Prize description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Prize image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Available stock quantity' })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Probability weight (1–100)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  weight?: number;

  @ApiPropertyOptional({ description: 'Wheel slot position (1–10)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  position?: number;
}
