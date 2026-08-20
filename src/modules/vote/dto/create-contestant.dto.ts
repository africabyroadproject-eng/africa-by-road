import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateContestantDto {
  @ApiProperty({ description: 'Full name of the contestant', example: 'Amara Diallo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Country represented by contestant', example: 'Senegal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country: string;

  @ApiProperty({ description: 'Contestant biography / pitch', example: 'Passionate road trip adventurer from Dakar.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  bio: string;

  @ApiProperty({ description: 'Profile image URL', example: 'https://cdn.africabyroad.com/contestants/amara.jpg' })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({
    description: 'Initial competition stage',
    enum: ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Final'],
    default: 'Stage 1',
  })
  @IsOptional()
  @IsEnum(['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Final'])
  currentStage?: 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4' | 'Final';

  @ApiPropertyOptional({
    description: 'Initial contestant status',
    enum: ['pending', 'active', 'eliminated', 'winner'],
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['pending', 'active', 'eliminated', 'winner'])
  status?: 'pending' | 'active' | 'eliminated' | 'winner';
}
