import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('reflect-metadata');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const {
  containsObjectionableText,
  OBJECTIONABLE_CONTENT_MESSAGE,
} = require('../dist/common/moderation/objectionable-text');
const { CreateGroupDto } = require('../dist/modules/groups/dto/create-group.dto');
const { RegisterDto } = require('../dist/modules/auth/dto/register.dto');
const { ReplaceExpenseDto } = require('../dist/modules/expenses/dto/expenses.dto');

const blocked = [
  'fuck this trip',
  'F.U.C.K',
  'f u c k',
  'sh!t',
  'fuuuuck',
  'fu-ck',
  'fu​ck',
  'Madarchod',
  'teri maa ki chut',
  'كس امك',
  'يا شرموطة',
  'حرامزادہ',
  'बहनचोद',
  '操 你 妈',
  'Hijo de puta',
  'coño',
  'enculé',
];
const clean = [
  'Scunthorpe trip',
  'assassin',
  'shiitake',
  'therapist',
  'cocktail',
  'Bob',
  'Conn',
  'Cumming',
  'maal',
  'saala ki shaadi',
  'kutta food',
  'chod do',
  'chutti',
  'cono de helado',
  'کس کا بل ہے',
  'نیک کام',
  'عرصہ',
  '我妈的生日',
  '窗口交费',
  '牛乳交易',
  '做爱心蛋糕',
  '我妈逼我学钢琴',
  'summa cum laude',
  'Dinner',
];
for (const text of blocked) assert.ok(containsObjectionableText(text), text);
for (const text of clean) assert.ok(!containsObjectionableText(text), text);

const constraintsFor = async (Dto, body, property) =>
  (await validate(plainToInstance(Dto, body))).find(
    (error) => error.property === property,
  )?.constraints;

assert.equal(
  (await constraintsFor(CreateGroupDto, { name: 'B1tch trip' }, 'name'))
    ?.allowedText,
  OBJECTIONABLE_CONTENT_MESSAGE,
);
assert.equal(
  await constraintsFor(CreateGroupDto, { name: 'Lahore trip' }, 'name'),
  undefined,
);
assert.ok(
  (await constraintsFor(RegisterDto, { displayName: 'chutiya' }, 'displayName'))
    ?.allowedText,
);
// IntersectionType must carry the decorator to replacements.
assert.ok(
  (await constraintsFor(ReplaceExpenseDto, { description: 'shit' }, 'description'))
    ?.allowedText,
);
console.log('content filter checks passed');
