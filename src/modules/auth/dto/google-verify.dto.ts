import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GoogleVerifyDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(10000)
  idToken: string;
}
