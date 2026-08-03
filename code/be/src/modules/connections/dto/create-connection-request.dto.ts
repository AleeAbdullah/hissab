import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateConnectionRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  receiverUserId!: string;
}
