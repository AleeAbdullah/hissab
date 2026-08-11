import { Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import { refreshSessions, users } from '../../database/schema';

@Injectable()
export class SessionAuthorizationService {
  constructor(private readonly database: DatabaseService) {}

  async isActive(userId: string, sessionId: string): Promise<boolean> {
    const [session] = await this.database.db
      .select({ id: refreshSessions.id })
      .from(refreshSessions)
      .innerJoin(
        users,
        and(eq(users.id, refreshSessions.userId), eq(users.status, 'ACTIVE')),
      )
      .where(
        and(
          eq(refreshSessions.id, sessionId),
          eq(refreshSessions.userId, userId),
          isNull(refreshSessions.consumedAt),
          isNull(refreshSessions.revokedAt),
          gt(refreshSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return Boolean(session);
  }
}
