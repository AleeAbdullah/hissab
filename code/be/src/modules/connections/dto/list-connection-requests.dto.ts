import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class ListConnectionRequestsDto {
  @ApiPropertyOptional({ enum: ['incoming', 'outgoing'] })
  @IsIn(['incoming', 'outgoing'])
  @IsOptional()
  direction?: 'incoming' | 'outgoing';

  @ApiPropertyOptional({
    enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'],
  })
  @IsIn(['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'])
  @IsOptional()
  status?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
}
