import {
  settlementsCreateSettlement,
  settlementsDeleteSettlement,
  settlementsGetSettlement,
  settlementsListSettlements,
  settlementsReplaceSettlement,
} from '@/api/generated/sdk.gen';
import type { CreateSettlementDto, ReplaceSettlementDto } from '@/api/generated/types.gen';
import type { Settlement, SettlementPage } from '@/api/contracts';
import { idempotencyKey, request } from '@/api/transport';

export function listSettlements(ledgerId: string, cursor?: string) {
  return request<SettlementPage>(() => settlementsListSettlements({ path: { ledgerId }, query: { cursor } }));
}

export function settlementQuery(settlementId: string) {
  return {
    queryKey: ['settlements', settlementId] as const,
    queryFn: () => request<Settlement>(() => settlementsGetSettlement({ path: { settlementId } })),
  };
}

export function createSettlement(ledgerId: string, body: CreateSettlementDto) {
  return request<Settlement>(() => settlementsCreateSettlement({ path: { ledgerId }, body, headers: { 'Idempotency-Key': idempotencyKey() } }));
}

export function replaceSettlement(settlementId: string, body: ReplaceSettlementDto) {
  return request<Settlement>(() => settlementsReplaceSettlement({ path: { settlementId }, body, headers: { 'Idempotency-Key': idempotencyKey() } }));
}

export function deleteSettlement(settlementId: string, expectedVersion: number) {
  return request<Settlement>(() => settlementsDeleteSettlement({ path: { settlementId }, query: { expectedVersion }, headers: { 'Idempotency-Key': idempotencyKey() } }));
}
