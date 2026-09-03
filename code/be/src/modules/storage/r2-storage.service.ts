import { Readable } from 'node:stream';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvironmentVariables } from '../../config/environment';

@Injectable()
export class R2StorageService {
  private readonly bucket?: string;
  private readonly client?: S3Client;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    if (!config.getOrThrow('R2_ENABLED')) return;

    const accountId = config.getOrThrow('R2_ACCOUNT_ID');
    this.bucket = config.getOrThrow('R2_BUCKET');
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.getOrThrow('R2_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  async put(
    objectKey: string,
    body: Buffer,
    contentType: string,
    sha256: string,
  ): Promise<void> {
    const { bucket, client } = this.requireConfiguration();
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: body,
          ContentLength: body.length,
          ContentType: contentType,
          Metadata: { 'hissab-sha256': sha256 },
        }),
      );
    } catch {
      throw new ServiceUnavailableException(
        'Receipt storage is temporarily unavailable.',
      );
    }
  }

  async get(objectKey: string): Promise<Readable | null> {
    const { bucket, client } = this.requireConfiguration();
    try {
      const result = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
      );
      return result.Body ? (result.Body as Readable) : null;
    } catch (error) {
      if (isMissingObject(error)) return null;
      throw new ServiceUnavailableException(
        'Receipt storage is temporarily unavailable.',
      );
    }
  }

  async remove(objectKey: string, signal?: AbortSignal): Promise<void> {
    const { bucket, client } = this.requireConfiguration();
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }),
      signal ? { abortSignal: signal } : undefined,
    );
  }

  private requireConfiguration(): { bucket: string; client: S3Client } {
    if (!this.bucket || !this.client) {
      throw new ServiceUnavailableException(
        'Receipt storage is not configured.',
      );
    }
    return { bucket: this.bucket, client: this.client };
  }
}

function isMissingObject(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    name?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };
  return (
    candidate.name === 'NoSuchKey' || candidate.$metadata?.httpStatusCode === 404
  );
}
