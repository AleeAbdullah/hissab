import { Equals, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { DISPLAY_CURRENCIES } from '../../common/display-currency';

const date = { type: String, format: 'date-time' } as const;
const nullableDate = { ...date, nullable: true } as const;

export class DeleteAccountDto {
  @ApiProperty({ minLength: 12, maxLength: 1024, writeOnly: true })
  @IsString()
  @MinLength(12)
  @MaxLength(1024)
  currentPassword!: string;

  @ApiProperty({ enum: ['DELETE'] })
  @IsString()
  @Equals('DELETE')
  confirmation!: 'DELETE';
}

export class AccountDeletionResultDto {
  @ApiProperty({ enum: ['ANONYMIZED'] })
  status!: 'ANONYMIZED';

  @ApiProperty(date)
  deletedAt!: Date;
}

export class ExportUserDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  displayName!: string;
}

export class ExportProfileDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: DISPLAY_CURRENCIES })
  displayCurrency!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({ enum: ['ACTIVE'] })
  status!: 'ACTIVE';

  @ApiProperty(date)
  createdAt!: Date;

  @ApiProperty(date)
  updatedAt!: Date;
}

export class ExportPreferencesDto {
  @ApiProperty({ enum: ['OWED_SHARE', 'CASH_OUT_OF_POCKET'] })
  personalReportMode!: 'OWED_SHARE' | 'CASH_OUT_OF_POCKET';

  @ApiProperty(date)
  createdAt!: Date;

  @ApiProperty(date)
  updatedAt!: Date;
}

export class ExportNotificationPreferencesDto {
  @ApiProperty()
  pushEnabled!: boolean;

  @ApiProperty()
  expenseActivityEnabled!: boolean;

  @ApiProperty()
  settlementActivityEnabled!: boolean;

  @ApiProperty()
  socialActivityEnabled!: boolean;

  @ApiProperty()
  remindersEnabled!: boolean;

  @ApiProperty(date)
  createdAt!: Date;

  @ApiProperty(date)
  updatedAt!: Date;
}

export class ExportMembershipDto {
  @ApiProperty({
    enum: ['INVITED', 'ACTIVE', 'DECLINED', 'CANCELLED', 'LEFT'],
  })
  status!: 'INVITED' | 'ACTIVE' | 'DECLINED' | 'CANCELLED' | 'LEFT';

  @ApiProperty({ format: 'uuid', nullable: true })
  invitedByUserId!: string | null;

  @ApiProperty(nullableDate)
  invitedAt!: Date | null;

  @ApiProperty(nullableDate)
  joinedAt!: Date | null;

  @ApiProperty(date)
  createdAt!: Date;

  @ApiProperty(date)
  updatedAt!: Date;
}

export class ExportGroupMemberDto extends ExportUserDto {
  @ApiProperty({
    enum: ['INVITED', 'ACTIVE', 'DECLINED', 'CANCELLED', 'LEFT'],
  })
  status!: 'INVITED' | 'ACTIVE' | 'DECLINED' | 'CANCELLED' | 'LEFT';

  @ApiProperty({ format: 'uuid', nullable: true })
  invitedByUserId!: string | null;

  @ApiProperty(nullableDate)
  invitedAt!: Date | null;

  @ApiProperty(nullableDate)
  joinedAt!: Date | null;

  @ApiProperty(date)
  createdAt!: Date;

  @ApiProperty(date)
  updatedAt!: Date;
}

export class ExportGroupDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['ACTIVE', 'ARCHIVED'] })
  status!: 'ACTIVE' | 'ARCHIVED';

  @ApiProperty({ type: ExportMembershipDto })
  membership!: ExportMembershipDto;

  @ApiProperty({ type: [ExportGroupMemberDto] })
  members!: ExportGroupMemberDto[];

  @ApiProperty(date)
  createdAt!: Date;

  @ApiProperty(date)
  updatedAt!: Date;
}

export class ExportDirectLedgerDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['ACTIVE', 'ARCHIVED'] })
  status!: 'ACTIVE' | 'ARCHIVED';

  @ApiProperty({ type: [ExportUserDto] })
  participants!: ExportUserDto[];

  @ApiProperty({
    enum: ['ACTIVE', 'LEFT'],
    nullable: true,
  })
  membershipStatus!: 'ACTIVE' | 'LEFT' | null;

  @ApiProperty(nullableDate)
  joinedAt!: Date | null;

  @ApiProperty(date)
  createdAt!: Date;

  @ApiProperty(date)
  updatedAt!: Date;
}

export class ExportConnectionRequestDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['INCOMING', 'OUTGOING'] })
  direction!: 'INCOMING' | 'OUTGOING';

  @ApiProperty({ type: ExportUserDto })
  sender!: ExportUserDto;

  @ApiProperty({ type: ExportUserDto })
  receiver!: ExportUserDto;

  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'] })
  status!: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

  @ApiProperty(date)
  createdAt!: Date;

  @ApiProperty(date)
  updatedAt!: Date;

  @ApiProperty(nullableDate)
  resolvedAt!: Date | null;
}

export class ExportBlockDto {
  @ApiProperty({ type: ExportUserDto })
  blockedUser!: ExportUserDto;

  @ApiProperty(date)
  createdAt!: Date;
}

export class ExportCategoryDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class ExportExpenseRevisionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  rootExpenseId!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  replacesExpenseId!: string | null;

  @ApiProperty({ format: 'uuid' })
  ledgerId!: string;

  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ pattern: '^[1-9][0-9]*$' })
  totalMinor!: string;

  @ApiProperty({ type: ExportCategoryDto })
  category!: ExportCategoryDto;

  @ApiProperty(date)
  occurredAt!: Date;

  @ApiProperty({ enum: ['ACTIVE', 'DELETED'] })
  status!: 'ACTIVE' | 'DELETED';

  @ApiProperty({ minimum: 1 })
  version!: number;

  @ApiProperty(date)
  createdAt!: Date;

  @ApiProperty(date)
  updatedAt!: Date;
}

export class ExportExpensePayerDto {
  @ApiProperty({ format: 'uuid' })
  expenseId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ pattern: '^[1-9][0-9]*$' })
  amountMinor!: string;
}

export class ExportExpenseSplitDto {
  @ApiProperty({ format: 'uuid' })
  expenseId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ pattern: '^[1-9][0-9]*$' })
  owedMinor!: string;

  @ApiProperty({ enum: ['EQUAL', 'EXACT'] })
  splitMethod!: 'EQUAL' | 'EXACT';
}

export class ExportPaymentRevisionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  rootPaymentId!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  replacesPaymentId!: string | null;

  @ApiProperty({ format: 'uuid' })
  ledgerId!: string;

  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;

  @ApiProperty({ format: 'uuid' })
  fromUserId!: string;

  @ApiProperty({ format: 'uuid' })
  toUserId!: string;

  @ApiProperty({ pattern: '^[1-9][0-9]*$' })
  amountMinor!: string;

  @ApiProperty(date)
  occurredAt!: Date;

  @ApiProperty({ enum: ['ACTIVE', 'DELETED'] })
  status!: 'ACTIVE' | 'DELETED';

  @ApiProperty({ minimum: 1 })
  version!: number;

  @ApiProperty(date)
  createdAt!: Date;

  @ApiProperty(date)
  updatedAt!: Date;
}

export class ExportFinancialEventDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  ledgerId!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  expenseId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  paymentId!: string | null;

  @ApiProperty({ enum: ['CREATED', 'REPLACEMENT', 'REVERSAL'] })
  eventType!: 'CREATED' | 'REPLACEMENT' | 'REVERSAL';

  @ApiProperty({ format: 'uuid', nullable: true })
  reversesEventId!: string | null;

  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;

  @ApiProperty(date)
  createdAt!: Date;
}

export class ExportEventAllocationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  financialEventId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ enum: ['PAYER', 'PARTICIPANT'] })
  role!: 'PAYER' | 'PARTICIPANT';

  @ApiProperty({ pattern: '^[1-9][0-9]*$' })
  amountMinor!: string;

  @ApiProperty({ enum: ['EQUAL', 'EXACT'], nullable: true })
  splitMethod!: 'EQUAL' | 'EXACT' | null;
}

export class ExportLedgerPostingDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  financialEventId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ pattern: '^-?[1-9][0-9]*$' })
  amountMinor!: string;
}

export class ExportSharedFinanceDto {
  @ApiProperty({ type: [ExportExpenseRevisionDto] })
  expenses!: ExportExpenseRevisionDto[];

  @ApiProperty({ type: [ExportExpensePayerDto] })
  expensePayers!: ExportExpensePayerDto[];

  @ApiProperty({ type: [ExportExpenseSplitDto] })
  expenseSplits!: ExportExpenseSplitDto[];

  @ApiProperty({ type: [ExportPaymentRevisionDto] })
  payments!: ExportPaymentRevisionDto[];

  @ApiProperty({ type: [ExportFinancialEventDto] })
  financialEvents!: ExportFinancialEventDto[];

  @ApiProperty({ type: [ExportEventAllocationDto] })
  eventAllocations!: ExportEventAllocationDto[];

  @ApiProperty({ type: [ExportLedgerPostingDto] })
  ledgerPostings!: ExportLedgerPostingDto[];
}

export class ExportPersonalLedgerDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty(date)
  createdAt!: Date;
}

export class ExportPersonalTransactionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  rootPersonalTransactionId!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  replacesPersonalTransactionId!: string | null;

  @ApiProperty({ enum: ['INCOME', 'EXPENSE'] })
  type!: 'INCOME' | 'EXPENSE';

  @ApiProperty({ pattern: '^[1-9][0-9]*$' })
  amountMinor!: string;

  @ApiProperty({ type: ExportCategoryDto })
  category!: ExportCategoryDto;

  @ApiProperty()
  description!: string;

  @ApiProperty({ nullable: true })
  merchantOrSource!: string | null;

  @ApiProperty(date)
  occurredAt!: Date;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty({ enum: ['ACTIVE', 'DELETED'] })
  status!: 'ACTIVE' | 'DELETED';

  @ApiProperty({ minimum: 1 })
  version!: number;

  @ApiProperty(date)
  createdAt!: Date;

  @ApiProperty(date)
  updatedAt!: Date;
}

export class ExportPersonalFinanceDto {
  @ApiProperty({ type: ExportPersonalLedgerDto })
  ledger!: ExportPersonalLedgerDto;

  @ApiProperty({ type: [ExportPersonalTransactionDto] })
  transactions!: ExportPersonalTransactionDto[];
}

export class ExportActivityDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: ExportUserDto, nullable: true })
  actor!: ExportUserDto | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  ledgerId!: string | null;

  @ApiProperty()
  eventType!: string;

  @ApiProperty()
  aggregateType!: string;

  @ApiProperty({ format: 'uuid' })
  aggregateId!: string;

  @ApiProperty(date)
  createdAt!: Date;
}

export class ExportReminderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  ledgerId!: string;

  @ApiProperty({ format: 'uuid' })
  requesterUserId!: string;

  @ApiProperty({ format: 'uuid' })
  recipientUserId!: string;

  @ApiProperty({ pattern: '^[1-9][0-9]*$' })
  owedMinor!: string;

  @ApiProperty(date)
  createdAt!: Date;
}

export class ExportNotificationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  actorUserId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  ledgerId!: string | null;

  @ApiProperty({ enum: ['EXPENSE', 'SETTLEMENT', 'SOCIAL', 'REMINDER'] })
  kind!: 'EXPENSE' | 'SETTLEMENT' | 'SOCIAL' | 'REMINDER';

  @ApiProperty()
  eventType!: string;

  @ApiProperty()
  aggregateType!: string;

  @ApiProperty({ format: 'uuid' })
  aggregateId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  details!: Record<string, unknown>;

  @ApiProperty(nullableDate)
  readAt!: Date | null;

  @ApiProperty(date)
  createdAt!: Date;
}

export class AccountExportDto {
  @ApiProperty({ enum: [1] })
  schemaVersion!: 1;

  @ApiProperty(date)
  generatedAt!: Date;

  @ApiProperty({ type: ExportProfileDto })
  profile!: ExportProfileDto;

  @ApiProperty({ type: ExportPreferencesDto })
  preferences!: ExportPreferencesDto;

  @ApiProperty({ type: ExportNotificationPreferencesDto })
  notificationPreferences!: ExportNotificationPreferencesDto;

  @ApiProperty({ type: [ExportGroupDto] })
  groups!: ExportGroupDto[];

  @ApiProperty({ type: [ExportDirectLedgerDto] })
  directLedgers!: ExportDirectLedgerDto[];

  @ApiProperty({ type: [ExportConnectionRequestDto] })
  connectionRequests!: ExportConnectionRequestDto[];

  @ApiProperty({ type: [ExportBlockDto] })
  blocks!: ExportBlockDto[];

  @ApiProperty({ type: ExportSharedFinanceDto })
  sharedFinance!: ExportSharedFinanceDto;

  @ApiProperty({ type: ExportPersonalFinanceDto })
  personalFinance!: ExportPersonalFinanceDto;

  @ApiProperty({ type: [ExportActivityDto] })
  activity!: ExportActivityDto[];

  @ApiProperty({ type: [ExportReminderDto] })
  reminders!: ExportReminderDto[];

  @ApiProperty({ type: [ExportNotificationDto] })
  notifications!: ExportNotificationDto[];
}
