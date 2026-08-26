import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@africabyroad.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'AdminPass123!' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
