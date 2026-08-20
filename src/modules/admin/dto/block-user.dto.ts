import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class BlockUserDto {
  @ApiProperty({ description: 'Whether to block (true) or unblock (false) the user', example: true })
  @IsBoolean()
  @IsNotEmpty()
  isBlocked: boolean;

  @ApiPropertyOptional({
    description: 'Reason for blocking or unblocking the user',
    example: 'Violation of community terms and conditions.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
