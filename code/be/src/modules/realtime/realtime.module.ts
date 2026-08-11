import { Module } from '@nestjs/common';

import { AuthModule } from '../auth';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeListenerService } from './realtime-listener.service';

@Module({
  imports: [AuthModule],
  providers: [RealtimeGateway, RealtimeListenerService],
})
export class RealtimeModule {}
