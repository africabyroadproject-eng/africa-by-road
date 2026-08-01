import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class VoteFavoriteDto {
  @ApiProperty()
  @IsMongoId()
  contestantId: string;
}
