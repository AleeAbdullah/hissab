import { registerDecorator } from 'class-validator';

import { BLOCKED_HAN, BLOCKED_WORDS } from './blocked-terms';

export const ALLOWED_TEXT_CONSTRAINT = 'allowedText';
export const OBJECTIONABLE_CONTENT_CODE = 'OBJECTIONABLE_CONTENT';
export const OBJECTIONABLE_CONTENT_MESSAGE =
  'This text contains language that is not allowed. Change it and try again.';

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  $: 's',
  '!': 'i',
  '|': 'i',
  '€': 'e',
};
// Arabic-keyboard and Urdu-keyboard spellings of the same letter.
const ARABIC_SCRIPT: Record<string, string> = {
  ي: 'ی',
  ى: 'ی',
  ك: 'ک',
  ه: 'ہ',
  ة: 'ہ',
  ۃ: 'ہ',
  ھ: 'ہ',
  أ: 'ا',
  إ: 'ا',
  آ: 'ا',
};

// Latin accents, Arabic harakat and tatweel, Devanagari nukta, zero-width characters.
const IGNORED_MARKS =
  /[\u0300-\u036f]|[\u064b-\u065f]|\u0670|\u0640|\u093c|\p{Cf}/gu;

function normalize(text: string): string {
  return (
    text
      .normalize('NFKC')
      .toLowerCase()
      .normalize('NFD')
      // Keep ñ so "coño" does not become "cono" (cone).
      .replace(/n\u0303/gu, '\u00f1')
      .replace(IGNORED_MARKS, '')
      .replace(/\u0901/gu, '\u0902')
      .replace(/./gu, (char) => LEET[char] ?? ARABIC_SCRIPT[char] ?? char)
  );
}

const squash = (word: string) => word.replace(/(.)\1+/gu, '$1');
const words = new Set<string>();
const squashedWords = new Set<string>();
const phrases: string[] = [];
for (const term of BLOCKED_WORDS.map(normalize)) {
  const word = term.replaceAll(' ', '');
  words.add(word);
  squashedWords.add(squash(word));
  if (term.includes(' ')) phrases.push(` ${term} `);
}
const han = BLOCKED_HAN.map(normalize);

function isBlockedWord(word: string): boolean {
  if (words.has(word)) return true;
  // Only words with a letter typed 3+ times ("fuuuck") are compared squashed,
  // so ordinary doubles such as "Conn" or "puttee" never match "coon" or "pute".
  if (/(.)\1\1/u.test(word) && squashedWords.has(squash(word))) return true;
  const unprefixed = word.replace(/^(?:و|یا)?ال/u, '');
  return unprefixed !== word && words.has(unprefixed);
}

export function containsObjectionableText(text: string): boolean {
  const normalized = normalize(text);
  const hanOnly = normalized.replace(/\P{Script=Han}/gu, '');
  if (han.some((term) => hanOnly.includes(term))) return true;

  const stream: string[] = [];
  const candidates: string[] = [];
  for (const chunk of normalized.split(/\s+/u)) {
    const parts = chunk.split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);
    stream.push(...parts);
    // "sh.it" and "fu-ck" are checked joined as well as split.
    candidates.push(...parts, parts.join(''));
  }
  // "f u c k" is checked as one word.
  for (const run of stream.join(' ').match(/(?:^| )(?:\S )+\S(?= |$)/gu) ??
    []) {
    candidates.push(run.replaceAll(' ', ''));
  }
  if (candidates.some(isBlockedWord)) return true;

  const joined = ` ${stream.join(' ')} `;
  return phrases.some((phrase) => joined.includes(phrase));
}

export function IsAllowedText(): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      name: ALLOWED_TEXT_CONSTRAINT,
      target: target.constructor,
      propertyName: String(propertyName),
      options: { message: OBJECTIONABLE_CONTENT_MESSAGE },
      validator: {
        validate: (value: unknown) =>
          typeof value !== 'string' || !containsObjectionableText(value),
      },
    });
}
