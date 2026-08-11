import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module';
import { BalancesModule } from '../balances/balances.module';
import { PersonalModule } from '../personal/personal.module';
import { UsersModule } from '../users/users.module';
import { HomeController } from './home.controller';
import { HomeRepository } from './home.repository';
import { HomeService } from './home.service';

@Module({
  imports: [ActivityModule, BalancesModule, PersonalModule, UsersModule],
  controllers: [HomeController],
  providers: [HomeRepository, HomeService],
})
export class HomeModule {}
