import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  copy,
  renderNotificationCopy,
} = require('../dist/modules/delivery/copy');
const {
  ExpoPushHandler,
} = require('../dist/modules/delivery/expo-push.handler');
const { LOCALES, resolveLocale } = require('../dist/common/locale');
const {
  DomainEventHandler,
} = require('../dist/modules/delivery/domain-event.handler');
const { EmailHandler } = require('../dist/modules/delivery/email.handler');

const { validate } = require('class-validator');
const { RegisterDto } = require('../dist/modules/auth/dto/register.dto');
const {
  UpdateProfileDto,
} = require('../dist/modules/users/dto/update-profile.dto');
for (const Dto of [RegisterDto, UpdateProfileDto]) {
  for (const locale of [...LOCALES, undefined]) {
    const dto = Object.assign(new Dto(), {
      email: 'test@example.com',
      password: 'valid-password-123',
      displayName: 'Ali',
      locale,
    });
    assert.equal((await validate(dto)).length, 0);
  }
  for (const locale of [null, 'en-PK', 'ur', 'EN', 'invalid', '']) {
    const errors = await validate(Object.assign(new Dto(), { locale }));
    assert.ok(errors.some((error) => error.property === 'locale'));
  }
}

const keys = ['someone', 'group', 'ledger', 'directLedger'];
for (const kind of ['expense', 'settlement']) {
  for (const action of ['created', 'replaced', 'deleted']) {
    for (const suffix of ['title', 'body', 'bodyWithLedger'])
      keys.push(`${kind}.${action}.${suffix}`);
  }
}
for (const event of [
  'group.invitation_sent',
  'connection.created',
  'connection.accepted',
  'reminder.created',
]) {
  keys.push(`${event}.title`, `${event}.body`);
}
keys.push('reset.subject', 'reset.intro', 'reset.instructions', 'reset.ignore');
const params = { actor: 'Ali $& {ledger}', ledger: 'Trip $&', minutes: '60' };
const placeholders = (text) =>
  [...text.matchAll(/\{\w+\}/g)].map(([key]) => key).sort();
for (const locale of LOCALES) {
  for (const key of keys) {
    assert.deepEqual(
      placeholders(copy(locale, key)),
      placeholders(copy('en', key)),
      `${locale}: ${key}`,
    );
    assert.ok(copy(locale, key).length);
    assert.equal(copy('unknown', key, params), copy('en', key, params));
  }
  assert.ok(
    copy(locale, 'reminder.created.title', params).includes(params.actor),
  );
  assert.ok(!copy(locale, 'reminder.created.body').includes('{amount'));
  assert.ok(copy(locale, 'reset.subject').includes('Tally Stick'));
  assert.ok(
    !/[\u0600-\u06ff]/u.test(copy('ur-Latn-PK', 'reminder.created.body')),
  );
}
assert.equal(resolveLocale(null), 'en');
assert.equal(resolveLocale('en-PK'), 'en');
assert.equal(resolveLocale('__proto__'), 'en');
assert.equal(
  copy('en', 'expense.created.bodyWithLedger', params),
  'Ali $& {ledger} added an expense in Trip $&.',
);

// Exercise locale batching through the real handler, including stored row/push linkage.
const stored = [];
const pushes = [];
let recipientQueries = 0;
const transaction = {
  select() {
    recipientQueries++;
    return {
      from: () => ({
        where: () => ({
          orderBy: () => ({
            for: async () => [
              { id: 'english', locale: 'en' },
              { id: 'arabic', locale: 'ar' },
              { id: 'fallback', locale: 'invalid' },
            ],
          }),
        }),
      }),
    };
  },
  insert: () => ({
    values(row) {
      stored.push(row);
      return {
        onConflictDoNothing: () => ({
          returning: async () => [{ id: row.recipientUserId }],
        }),
      };
    },
  }),
  execute: async () => {},
};
const handler = new DomainEventHandler(
  { transaction: (run) => run(transaction) },
  {},
  { enqueue: async (_, event) => pushes.push(event) },
);
handler.realtimeRecipients = async () => [];
handler.activeLedgerMembers = async () => ['english', 'arabic', 'fallback'];
handler.userName = async () => 'Ali';
handler.ledgerContext = async () => ({ name: null, type: 'DIRECT' });
const event = {
  id: 'event',
  eventType: 'expense.replaced',
  aggregateId: 'expense',
  aggregateType: 'expense',
  payload: { actorUserId: 'actor', ledgerId: 'ledger' },
};
await handler.handle(event);
assert.equal(recipientQueries, 1);
assert.equal(stored.length, 3);
for (const row of stored) {
  const locale = row.recipientUserId === 'arabic' ? 'ar' : 'en';
  assert.equal(row.title, copy(locale, 'expense.replaced.title'));
  assert.equal(
    row.body,
    copy(locale, 'expense.replaced.bodyWithLedger', {
      actor: 'Ali',
      ledger: copy(locale, 'directLedger'),
    }),
  );
}
assert.equal(pushes.length, 3);
assert.deepEqual(
  pushes.map((push) => push.payload.notificationId).sort(),
  stored.map((row) => row.recipientUserId).sort(),
);

// A queued push follows the current language while its inbox snapshot stays intact.
const original = stored.find((row) => row.recipientUserId === 'english');
let sent;
const pushHandler = new ExpoPushHandler(
  {
    pool: {
      query: async (sql) => ({
        rows: sql.includes('select delivery.')
          ? [
              {
                notification_id: 'notification',
                device_token_id: 'device',
                token: 'test-token',
              },
            ]
          : [],
      }),
    },
  },
  { getOrThrow: () => 'test-only' },
  {},
  {},
);
pushHandler.findNotification = async () => ({
  ...original,
  id: 'notification',
  recipient_user_id: 'english',
  event_type: event.eventType,
  aggregate_id: event.aggregateId,
  locale: 'ar',
  push_enabled: true,
  kind_enabled: true,
});
pushHandler.postJson = async (_url, body) => {
  sent = body;
  return { data: [{ status: 'ok', id: 'ticket' }] };
};
pushHandler.markTicketed = async () => {};
await pushHandler.sendNotification(
  'notification',
  new AbortController().signal,
);
assert.equal(sent[0].title, copy('ar', 'expense.replaced.title'));
assert.equal(
  sent[0].body,
  renderNotificationCopy('ar', original.payload.copy).body,
);
assert.equal(original.title, copy('en', 'expense.replaced.title'));
assert.equal(renderNotificationCopy('ar', { title: '__proto__' }), null);
assert.equal(renderNotificationCopy('ar', undefined), null);

// Reset emails use recipient locale while preserving link and token scrubbing.
for (const locale of LOCALES) {
  let scrubbed = false;
  let message;
  const email = new EmailHandler(
    {
      pool: {
        query: async (sql) => {
          if (sql.startsWith('select'))
            return { rows: [{ email: 'test@example.com', locale }] };
          scrubbed = sql.includes("payload - 'resetToken'");
        },
      },
    },
    {
      getOrThrow: (key) =>
        ({
          PUBLIC_WEB_URL: 'https://example.com',
          PASSWORD_RESET_TTL_SECONDS: 3600,
        })[key],
    },
    {},
  );
  email.send = async (value) => {
    message = value;
  };
  await email.sendPasswordReset(
    { ...event, payload: { resetToken: 'secret token' } },
    new AbortController().signal,
  );
  assert.equal(message.subject, copy(locale, 'reset.subject'));
  assert.ok(
    message.text.includes(
      copy(locale, 'reset.instructions', { minutes: '60' }),
    ),
  );
  assert.ok(
    message.text.includes(
      'https://example.com/reset-password/#token=secret%20token',
    ),
  );
  assert.ok(scrubbed);
}
console.log(
  `Delivery locale assertions passed (${LOCALES.length} locales, ${keys.length} copy keys).`,
);
