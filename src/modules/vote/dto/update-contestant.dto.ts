import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateContestantDto {
  @ApiPropertyOptional({ description: 'Updated contestant name', example: 'Amara Diallo' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Updated country', example: 'Senegal' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'Updated biography', example: 'Updated bio details.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ description: 'Updated profile image URL', example: 'https://cdn.africabyroad.com/contestants/amara-v2.jpg' })
  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;
}
