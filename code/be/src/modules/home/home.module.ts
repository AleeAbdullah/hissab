import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity';
import { BalancesModule } from '../balances';
import { PersonalModule } from '../personal';
import { UsersModule } from '../users';
import { HomeController } from './home.controller';
import { HomeRepository } from './home.repository';
import { HomeService } from './home.service';

@Module({
  imports: [ActivityModule, BalancesModule, PersonalModule, UsersModule],
  controllers: [HomeController],
  providers: [HomeRepository, HomeService],
})
export class HomeModule {}
