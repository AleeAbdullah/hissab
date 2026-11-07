import type { Report } from '@/api/contracts';
import type { CreateReportDto } from '@/api/generated';
import { reportsCreateReport } from '@/api/generated/sdk.gen';
import { idempotencyKey, request } from '@/api/transport';

export type ReportTargetType = CreateReportDto['targetType'];
export type ReportReason = CreateReportDto['reason'];

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'HARASSMENT', label: 'Harassment or abuse' },
  { value: 'SPAM_OR_SCAM', label: 'Spam or scam' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate name or content' },
  { value: 'IMPERSONATION', label: 'Impersonation' },
  { value: 'OTHER', label: 'Something else' }
];

export function createReport(body: CreateReportDto) {
  return request<Report>(() =>
    reportsCreateReport({
      body,
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
}
