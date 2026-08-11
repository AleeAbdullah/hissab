import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, type Notification } from 'pg';

import type { EnvironmentVariables } from '../../config/environment';
import { RealtimeGateway } from './realtime.gateway';
import {
  REALTIME_CHANNEL,
  SESSION_REVOCATION_CHANNEL,
  type RealtimeInvalidation,
  type SessionRevocation,
} from './realtime.types';

@Injectable()
export class RealtimeListenerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(RealtimeListenerService.name);
  private client?: Client;
  private reconnectTimer?: NodeJS.Timeout;
  private stopping = false;

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly gateway: RealtimeGateway,
  ) {}

  onApplicationBootstrap(): void {
    void this.connect();
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopping = true;
    this.gateway.setAvailable(false);
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    const client = this.client;
    this.client = undefined;
    if (client) {
      await client.query(`UNLISTEN ${REALTIME_CHANNEL}`).catch(() => undefined);
      await client
        .query(`UNLISTEN ${SESSION_REVOCATION_CHANNEL}`)
        .catch(() => undefined);
      await client.end().catch(() => undefined);
    }
  }

  private async connect(): Promise<void> {
    if (this.stopping || this.client) {
      return;
    }

    let client: Client | undefined;
    try {
      client = new Client({
        connectionString: this.config.getOrThrow('DATABASE_URL'),
        ssl: this.config.getOrThrow('DATABASE_SSL')
          ? { rejectUnauthorized: true }
          : false,
      });
      client.on('notification', (message) => this.onNotification(message));
      await client.connect();
      await client.query(`LISTEN ${REALTIME_CHANNEL}`);
      await client.query(`LISTEN ${SESSION_REVOCATION_CHANNEL}`);
      if (this.stopping) {
        await client.end();
        return;
      }
      const connectedClient = client;
      this.client = connectedClient;
      this.gateway.setAvailable(true);
      let reconnecting = false;
      const reconnect = (error?: unknown) => {
        if (this.stopping || reconnecting) {
          return;
        }
        reconnecting = true;
        this.gateway.setAvailable(false);
        this.logger.error(
          'Realtime database listener disconnected.',
          error instanceof Error ? error.stack : undefined,
        );
        if (this.client === connectedClient) {
          this.client = undefined;
        }
        void connectedClient.end().catch(() => undefined);
        this.scheduleReconnect();
      };
      connectedClient.once('error', reconnect);
      connectedClient.once('end', reconnect);
    } catch (error) {
      this.gateway.setAvailable(false);
      await client?.end().catch(() => undefined);
      this.logger.error(
        'Could not start realtime database listener.',
        error instanceof Error ? error.stack : undefined,
      );
      this.scheduleReconnect();
    }
  }

  private onNotification(message: Notification): void {
    if (!message.payload) {
      return;
    }
    try {
      if (message.channel === SESSION_REVOCATION_CHANNEL) {
        const event = JSON.parse(message.payload) as SessionRevocation;
        if (
          typeof event.userId !== 'string' ||
          typeof event.sessionId !== 'string'
        ) {
          throw new Error('invalid session revocation payload');
        }
        this.gateway.disconnectSession(event.userId, event.sessionId);
        return;
      }
      if (message.channel !== REALTIME_CHANNEL) {
        return;
      }
      const event = JSON.parse(message.payload) as RealtimeInvalidation;
      if (
        !Array.isArray(event.userIds) ||
        event.userIds.some((userId) => typeof userId !== 'string') ||
        typeof event.eventType !== 'string' ||
        typeof event.aggregateId !== 'string'
      ) {
        throw new Error('invalid realtime payload');
      }
      this.gateway.publish(event);
    } catch {
      this.logger.warn('Ignored an invalid realtime database notification.');
    }
  }

  private scheduleReconnect(): void {
    if (this.stopping || this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, 5_000);
  }
}
