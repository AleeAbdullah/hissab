import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorBody {
  code?: string;
  details?: unknown;
  error?: string;
  message?: string | string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionBody =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const body =
      typeof exceptionBody === 'object' && exceptionBody !== null
        ? (exceptionBody as ErrorBody)
        : undefined;
    const rawMessage = body?.message ?? exceptionBody;
    const message =
      status === 500
        ? 'An unexpected error occurred.'
        : (rawMessage ?? 'Request failed.');

    if (!(exception instanceof HttpException) || status >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} failed`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      error: {
        code: body?.code ?? body?.error ?? `HTTP_${status}`,
        message,
        ...(body?.details === undefined ? {} : { details: body.details }),
      },
      requestId:
        typeof (response.locals as Record<string, unknown>).requestId ===
        'string'
          ? (response.locals as Record<string, unknown>).requestId
          : undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
