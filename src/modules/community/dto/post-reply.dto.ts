import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PostReplyDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  content: string;
}
