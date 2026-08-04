import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class InviteGroupUserDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;
}
