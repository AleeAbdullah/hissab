import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { EnvironmentVariables } from '../config/environment';
import * as schema from './schema';

export type AppDatabase = NodePgDatabase<typeof schema>;
export type DatabaseTransaction = Parameters<
  Parameters<AppDatabase['transaction']>[0]
>[0];

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  readonly pool: Pool;
  readonly db: AppDatabase;

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.pool = new Pool({
      connectionString: this.configService.getOrThrow('DATABASE_URL'),
      max: this.configService.getOrThrow('DATABASE_POOL_MAX'),
      ssl: this.configService.getOrThrow('DATABASE_SSL')
        ? { rejectUnauthorized: true }
        : false,
    });
    this.db = drizzle(this.pool, { schema });
  }

  transaction<T>(
    callback: (transaction: DatabaseTransaction) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(callback);
  }

  async ping(): Promise<void> {
    await this.pool.query('select 1');
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
