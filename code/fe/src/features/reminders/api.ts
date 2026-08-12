import { remindersCreateReminder } from '@/api/generated/sdk.gen';
import type { Reminder } from '@/api/contracts';
import { idempotencyKey, request } from '@/api/transport';

export function createReminder(ledgerId: string, recipientUserId: string) {
  return request<Reminder>(() =>
    remindersCreateReminder({
      path: { ledgerId },
      body: { recipientUserId },
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
}
