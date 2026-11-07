import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';

import type { DatabaseTransaction } from '../../database/database.service';
import { userReports } from '../../database/schema';
import { IdempotencyService } from '../idempotency';
import { OutboxService } from '../outbox';
import type { CreateReportDto, ReportDto } from './dto/create-report.dto';

// Each report sends a support email, so cap volume per reporter.
const DAILY_REPORT_LIMIT = 20;

@Injectable()
export class ReportsService {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly outbox: OutboxService,
  ) {}

  createReport(
    reporterUserId: string,
    idempotencyKey: string,
    dto: CreateReportDto,
  ): Promise<ReportDto> {
    const targetId = dto.targetId.toLowerCase();
    const details = dto.details?.trim() || null;
    if (dto.targetType === 'USER' && targetId === reporterUserId) {
      throw new BadRequestException('You cannot report yourself.');
    }
    return this.idempotency.execute(
      {
        actor: {
          kind: 'user',
          subject: reporterUserId,
          userId: reporterUserId,
        },
        key: idempotencyKey,
        request: {
          targetType: dto.targetType,
          targetId,
          reason: dto.reason,
          details,
        },
        responseStatus: 201,
        routeScope: 'reports:create',
      },
      async (transaction) => {
        await this.requireUnderDailyLimit(transaction, reporterUserId);
        // Only people and groups the reporter already knows can be reported,
        // so the endpoint cannot be used to probe arbitrary IDs.
        const visible =
          dto.targetType === 'USER'
            ? await this.isKnownUser(transaction, reporterUserId, targetId)
            : await this.isKnownGroup(transaction, reporterUserId, targetId);
        if (!visible) {
          throw new NotFoundException(
            dto.targetType === 'USER' ? 'User not found.' : 'Group not found.',
          );
        }
        const [report] = await transaction
          .insert(userReports)
          .values({
            reporterUserId,
            reportedUserId: dto.targetType === 'USER' ? targetId : null,
            groupLedgerId: dto.targetType === 'GROUP' ? targetId : null,
            reason: dto.reason,
            details,
          })
          .returning({ id: userReports.id, createdAt: userReports.createdAt });
        if (!report) {
          throw new Error('Report insert returned no row.');
        }
        // Not a domain event: the reported user gets no notification or activity.
        await this.outbox.enqueue(transaction, {
          eventType: 'report.created',
          aggregateType: 'report',
          aggregateId: report.id,
          payload: {},
        });
        return report;
      },
    );
  }

  private async requireUnderDailyLimit(
    transaction: DatabaseTransaction,
    reporterUserId: string,
  ): Promise<void> {
    const result = await transaction.execute(sql`
      select count(*)::int as "count"
      from user_reports
      where reporter_user_id = ${reporterUserId}::uuid
        and created_at > now() - interval '1 day'
    `);
    const count = (result.rows[0] as { count?: number } | undefined)?.count;
    if ((count ?? 0) >= DAILY_REPORT_LIMIT) {
      throw new HttpException(
        'You have sent the maximum number of reports for today. Try again tomorrow.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async isKnownUser(
    transaction: DatabaseTransaction,
    reporterUserId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const result = await transaction.execute(sql`
      select exists (
        select 1
        from ledger_members mine
        join ledger_members theirs on theirs.ledger_id = mine.ledger_id
        where mine.user_id = ${reporterUserId}::uuid
          and theirs.user_id = ${targetUserId}::uuid
      ) or exists (
        select 1
        from connection_requests request
        where (request.sender_user_id = ${reporterUserId}::uuid
            and request.receiver_user_id = ${targetUserId}::uuid)
          or (request.sender_user_id = ${targetUserId}::uuid
            and request.receiver_user_id = ${reporterUserId}::uuid)
      ) as "known"
    `);
    return (result.rows[0] as { known?: boolean } | undefined)?.known === true;
  }

  private async isKnownGroup(
    transaction: DatabaseTransaction,
    reporterUserId: string,
    groupLedgerId: string,
  ): Promise<boolean> {
    const result = await transaction.execute(sql`
      select exists (
        select 1
        from ledger_members membership
        join ledgers ledger on ledger.id = membership.ledger_id
        where ledger.id = ${groupLedgerId}::uuid
          and ledger.type = 'GROUP'
          and membership.user_id = ${reporterUserId}::uuid
      ) as "known"
    `);
    return (result.rows[0] as { known?: boolean } | undefined)?.known === true;
  }
}
