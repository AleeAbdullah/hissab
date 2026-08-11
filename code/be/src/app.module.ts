import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { JwtAuthGuard } from './common/auth';
import { RequestIdMiddleware } from './common/http/request-id.middleware';
import { validateEnvironment } from './config/environment';
import { DatabaseModule } from './database/database.module';
import { AccountModule } from './modules/account';
import { ActivityModule } from './modules/activity';
import { AuthModule } from './modules/auth';
import { BalancesModule } from './modules/balances';
import { ConnectionsModule } from './modules/connections/connections.module';
import { ExpensesModule } from './modules/expenses';
import { GroupsModule } from './modules/groups';
import { HealthModule } from './modules/health/health.module';
import { HomeModule } from './modules/home';
import { IdempotencyModule } from './modules/idempotency';
import { NotificationsModule } from './modules/notifications';
import { OutboxModule } from './modules/outbox';
import { PersonalModule } from './modules/personal';
import { RealtimeModule } from './modules/realtime';
import { RemindersModule } from './modules/reminders';
import { SettlementsModule } from './modules/settlements';
import { UsersModule } from './modules/users';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      expandVariables: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    JwtModule.register({ global: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    DatabaseModule,
    HealthModule,
    HomeModule,
    IdempotencyModule,
    OutboxModule,
    AuthModule,
    AccountModule,
    UsersModule,
    ConnectionsModule,
    ActivityModule,
    BalancesModule,
    ExpensesModule,
    GroupsModule,
    SettlementsModule,
    PersonalModule,
    NotificationsModule,
    RemindersModule,
    RealtimeModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('{*path}');
  }
}
