import { randomUUID } from 'node:crypto';

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const requestedId = request.header('x-request-id');
    const requestId =
      requestedId && REQUEST_ID_PATTERN.test(requestedId)
        ? requestedId
        : randomUUID();

    response.locals.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    next();
  }
}
