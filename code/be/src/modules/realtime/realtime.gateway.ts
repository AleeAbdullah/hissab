import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { SessionAuthorizationService } from '../../common/auth';
import type { EnvironmentVariables } from '../../config/environment';
import type { RealtimeInvalidation } from './realtime.types';

interface AccessTokenPayload {
  exp?: unknown;
  sub?: unknown;
  sid?: unknown;
  jti?: unknown;
  typ?: unknown;
}

@WebSocketGateway({ namespace: '/events', transports: ['websocket'] })
export class RealtimeGateway implements OnGatewayInit {
  @WebSocketServer()
  private server?: Server;
  private available = false;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly sessions: SessionAuthorizationService,
  ) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      void this.authenticate(socket).then(() => next(), next);
    });
  }

  publish(event: RealtimeInvalidation): void {
    if (!this.available || !this.server) {
      return;
    }
    for (const userId of new Set(event.userIds)) {
      this.server.to(this.room(userId)).emit('invalidate', {
        area: event.area,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        ...(event.ledgerId ? { ledgerId: event.ledgerId } : {}),
        ...(event.notificationId
          ? { notificationId: event.notificationId }
          : {}),
      });
    }
  }

  disconnectSession(userId: string, sessionId: string): void {
    if (!this.server) {
      return;
    }
    const sockets = this.server.in(this.sessionRoom(userId, sessionId));
    sockets.emit('resync', { reason: 'session_revoked' });
    sockets.disconnectSockets(true);
  }

  setAvailable(available: boolean): void {
    this.available = available;
    if (!available && this.server) {
      this.server.emit('resync', { reason: 'realtime_listener_unavailable' });
      this.server.disconnectSockets(true);
    }
  }

  private async authenticate(socket: Socket): Promise<void> {
    const authorization = socket.handshake.headers.authorization;
    const bearer =
      typeof authorization === 'string'
        ? /^Bearer\s+([^\s]+)$/i.exec(authorization)?.[1]
        : undefined;
    const handshakeAuth = socket.handshake.auth as Record<string, unknown>;
    const authToken = handshakeAuth.accessToken;
    const token = typeof authToken === 'string' ? authToken : bearer;

    if (!token) {
      throw new Error('Authentication required.');
    }

    const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      issuer: this.config.getOrThrow('JWT_ISSUER'),
      audience: this.config.getOrThrow('JWT_AUDIENCE'),
    });

    if (
      payload.typ !== 'access' ||
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string' ||
      typeof payload.jti !== 'string' ||
      typeof payload.exp !== 'number'
    ) {
      throw new Error('Authentication required.');
    }
    if (!this.available) {
      throw new Error('Realtime is temporarily unavailable.');
    }
    if (!(await this.sessions.isActive(payload.sub, payload.sid))) {
      throw new Error('Authentication required.');
    }

    await socket.join([
      this.room(payload.sub),
      this.sessionRoom(payload.sub, payload.sid),
    ]);
    if (
      !this.available ||
      !(await this.sessions.isActive(payload.sub, payload.sid))
    ) {
      socket.disconnect(true);
      throw new Error('Authentication required.');
    }
    const expiryTimer = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, payload.exp * 1_000 - Date.now()),
    );
    socket.once('disconnect', () => clearTimeout(expiryTimer));
  }

  private room(userId: string): string {
    return `user:${userId}`;
  }

  private sessionRoom(userId: string, sessionId: string): string {
    return `session:${userId}:${sessionId}`;
  }
}
