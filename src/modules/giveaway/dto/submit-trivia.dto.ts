import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsMongoId } from 'class-validator';

export class SubmitTriviaDto {
  @ApiProperty()
  @IsMongoId()
  questionId: string;

  @ApiProperty()
  @IsInt()
  selectedAnswer: number;
}
