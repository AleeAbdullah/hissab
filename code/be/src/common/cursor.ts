import { BadRequestException } from '@nestjs/common';

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MICROSECOND_TIMESTAMP_PATTERN =
  /^(?!0000)\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

export interface OccurrenceCursor {
  occurredAt: Date;
  rootId: string;
}

export interface TimestampCursor {
  createdAt: string;
  id: string;
}

function encode(parts: [string, string]): string {
  return Buffer.from(JSON.stringify(parts)).toString('base64url');
}

function decode(cursor: string): [string, string] | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 2 ||
      typeof parsed[0] !== 'string' ||
      typeof parsed[1] !== 'string' ||
      !UUID_PATTERN.test(parsed[1])
    ) {
      return null;
    }
    return [parsed[0], parsed[1].toLowerCase()];
  } catch {
    return null;
  }
}

export function encodeOccurrenceCursor(item: {
  occurredAt: Date | string;
  id: string;
}): string {
  return encode([new Date(item.occurredAt).toISOString(), item.id]);
}

export function decodeOccurrenceCursor(
  cursor: string,
  subject: string,
): OccurrenceCursor {
  const parts = decode(cursor);
  const occurredAt = parts ? new Date(parts[0]) : null;
  if (!parts || !occurredAt || Number.isNaN(occurredAt.getTime())) {
    throw new BadRequestException(`Invalid ${subject} cursor.`);
  }
  return { occurredAt, rootId: parts[1] };
}

export function encodeTimestampCursor(item: {
  cursorCreatedAt: string;
  id: string;
}): string {
  return encode([item.cursorCreatedAt, item.id]);
}

export function decodeTimestampCursor(
  cursor: string,
  subject: string,
): TimestampCursor {
  const parts = decode(cursor);
  if (!parts || !MICROSECOND_TIMESTAMP_PATTERN.test(parts[0])) {
    throw new BadRequestException(`Invalid ${subject} cursor.`);
  }
  const createdAt = new Date(parts[0]);
  const millisecondTimestamp = parts[0].replace(/(\.\d{3})\d{3}Z$/, '$1Z');
  if (
    Number.isNaN(createdAt.getTime()) ||
    createdAt.toISOString() !== millisecondTimestamp
  ) {
    throw new BadRequestException(`Invalid ${subject} cursor.`);
  }
  return { createdAt: parts[0], id: parts[1] };
}

export function pageOf<T>(
  rows: T[],
  limit: number,
  encodeLast: (item: NoInfer<T>) => string,
): { items: T[]; nextCursor: string | null } {
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: rows.length > limit && last ? encodeLast(last) : null,
  };
}
