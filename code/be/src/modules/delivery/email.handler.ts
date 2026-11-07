import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvironmentVariables } from '../../config/environment';
import { DatabaseService } from '../../database/database.service';
import {
  type ClaimedOutboxEvent,
  type OutboxHandler,
  OutboxHandlerRegistry,
} from '../outbox';

const RESEND_URL = 'https://api.resend.com/emails';

const REASON_LABELS: Record<string, string> = {
  HARASSMENT: 'Harassment or abuse',
  SPAM_OR_SCAM: 'Spam or scam',
  INAPPROPRIATE_CONTENT: 'Inappropriate name or content',
  IMPERSONATION: 'Impersonation',
  OTHER: 'Other',
};

interface ReportRow {
  id: string;
  reason: string;
  details: string | null;
  created_at: Date;
  reporter_user_id: string;
  reporter_name: string;
  reporter_email: string | null;
  reported_user_id: string | null;
  reported_name: string | null;
  group_ledger_id: string | null;
  group_name: string | null;
}

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

@Injectable()
export class EmailHandler implements OutboxHandler, OnModuleInit {
  readonly eventTypes = ['auth.password_reset_requested', 'report.created'];
  private readonly logger = new Logger(EmailHandler.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly registry: OutboxHandlerRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async handle(event: ClaimedOutboxEvent, signal: AbortSignal): Promise<void> {
    if (!this.config.getOrThrow('MAIL_ENABLED')) {
      this.logger.warn(`Mail is disabled; skipped ${event.eventType}.`);
      return;
    }
    if (event.eventType === 'auth.password_reset_requested') {
      await this.sendPasswordReset(event, signal);
      return;
    }
    await this.sendReport(event, signal);
  }

  private async sendPasswordReset(
    event: ClaimedOutboxEvent,
    signal: AbortSignal,
  ): Promise<void> {
    const token = event.payload.resetToken;
    if (typeof token !== 'string') {
      return; // Already sent; the token was scrubbed afterwards.
    }
    const result = await this.database.pool.query<{ email: string | null }>(
      `select email from users where id = $1::uuid and status = 'ACTIVE'`,
      [event.aggregateId],
    );
    const email = result.rows[0]?.email;
    if (email) {
      // The token stays in the URL fragment so it never reaches web server logs.
      const link = `${this.config.getOrThrow<string>('PUBLIC_WEB_URL')}/reset-password/#token=${encodeURIComponent(token)}`;
      const minutes = Math.round(
        this.config.getOrThrow('PASSWORD_RESET_TTL_SECONDS') / 60,
      );
      await this.send(
        {
          to: email,
          subject: 'Reset your Tally Stick password',
          text: [
            'Someone asked to reset the password for your Tally Stick account.',
            '',
            `Open this link on the phone where Tally Stick is installed to choose a new password. It expires in ${minutes} minutes and works once.`,
            '',
            link,
            '',
            "If you didn't ask for this, ignore this email. Your password won't change.",
          ].join('\n'),
        },
        event.id,
        signal,
      );
    }
    // Keep the plaintext token out of the database once it has been delivered.
    await this.database.pool.query(
      `update outbox_events set payload = payload - 'resetToken' where id = $1::uuid`,
      [event.id],
    );
  }

  private async sendReport(
    event: ClaimedOutboxEvent,
    signal: AbortSignal,
  ): Promise<void> {
    const result = await this.database.pool.query<ReportRow>(
      `select report.id,
              report.reason,
              report.details,
              report.created_at,
              reporter.id as reporter_user_id,
              reporter.display_name as reporter_name,
              reporter.email as reporter_email,
              reported.id as reported_user_id,
              reported.display_name as reported_name,
              report.group_ledger_id,
              profile.name as group_name
       from user_reports report
       join users reporter on reporter.id = report.reporter_user_id
       left join users reported on reported.id = report.reported_user_id
       left join group_profiles profile on profile.ledger_id = report.group_ledger_id
       where report.id = $1::uuid`,
      [event.aggregateId],
    );
    const report = result.rows[0];
    if (!report) {
      return;
    }
    const target = report.reported_user_id
      ? `Person: ${report.reported_name ?? 'Unknown'} (user ${report.reported_user_id})`
      : `Group: ${report.group_name ?? 'Unknown'} (ledger ${report.group_ledger_id})`;
    await this.send(
      {
        to: this.config.getOrThrow<string>('SUPPORT_EMAIL'),
        subject: `Tally Stick report: ${REASON_LABELS[report.reason] ?? report.reason}`,
        text: [
          `Report ${report.id}`,
          `Filed: ${report.created_at.toISOString()}`,
          `Reason: ${REASON_LABELS[report.reason] ?? report.reason}`,
          target,
          `Reporter: ${report.reporter_name} (user ${report.reporter_user_id})`,
          '',
          'Details:',
          report.details ?? '(none)',
        ].join('\n'),
        ...(report.reporter_email ? { replyTo: report.reporter_email } : {}),
      },
      event.id,
      signal,
    );
  }

  private async send(
    message: EmailMessage,
    idempotencyKey: string,
    signal: AbortSignal,
  ): Promise<void> {
    const response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.config.getOrThrow<string>('RESEND_API_KEY')}`,
        'content-type': 'application/json',
        // Retries of the same outbox event never send a second email.
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify({
        from: this.config.getOrThrow<string>('MAIL_FROM'),
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
      signal,
    });
    if (!response.ok) {
      throw new Error(`Resend request failed with HTTP ${response.status}.`);
    }
  }
}
