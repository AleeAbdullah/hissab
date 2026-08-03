import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { DatabaseService } from '../../database/database.service';
import { Public } from '../../common/auth/public.decorator';

@Public()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get('live')
  @ApiOperation({ summary: 'Process liveness check' })
  live() {
    return { status: 'ok' } as const;
  }

  @Get('ready')
  @ApiOperation({ summary: 'Database readiness check' })
  async ready() {
    try {
      await this.databaseService.ping();
      return { database: 'up', status: 'ok' } as const;
    } catch {
      throw new ServiceUnavailableException({
        code: 'DATABASE_UNAVAILABLE',
        message: 'The database is not ready.',
      });
    }
  }
}
