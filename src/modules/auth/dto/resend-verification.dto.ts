import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email: string;
}
