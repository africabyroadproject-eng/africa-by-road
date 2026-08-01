import { ApiProperty } from '@nestjs/swagger';
import { IsHexadecimal, IsString, Length, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @Length(64, 64)
  @IsHexadecimal()
  token: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  newPassword: string;
}
