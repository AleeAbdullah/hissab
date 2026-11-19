import type { Report } from '@/api/contracts';
import type { CreateReportDto } from '@/api/generated';
import { reportsCreateReport } from '@/api/generated/sdk.gen';
import { idempotencyKey, request } from '@/api/transport';

export type ReportTargetType = CreateReportDto['targetType'];
export type ReportReason = CreateReportDto['reason'];

export const REPORT_REASONS = [
  { value: 'HARASSMENT', label: 'harassmentOrAbuse' },
  { value: 'SPAM_OR_SCAM', label: 'spamOrScam' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'inappropriateNameOrContent' },
  { value: 'IMPERSONATION', label: 'impersonation' },
  { value: 'OTHER', label: 'somethingElse' }
] as const satisfies readonly { value: ReportReason; label: string }[];

export function createReport(body: CreateReportDto) {
  return request<Report>(() =>
    reportsCreateReport({
      body,
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
}
