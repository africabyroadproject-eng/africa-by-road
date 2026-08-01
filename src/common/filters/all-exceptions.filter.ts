import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const isProduction = process.env.NODE_ENV === 'production';

    const err = exception instanceof Error ? exception : new Error('Unknown error');
    const logMessage = `${req.method} ${req.path} ${statusCode} ${err.message}`;
    if (isHttpException) {
      this.logger.warn(logMessage);
    } else {
      this.logger.error(logMessage, isProduction ? undefined : err.stack);
    }

    if (res.headersSent) {
      return;
    }

    if (isHttpException) {
      const body = exception.getResponse();
      res.status(statusCode).json(typeof body === 'string' ? { message: body } : body);
      return;
    }

    res.status(statusCode).json({
      message: isProduction ? 'An unexpected error occurred' : err.message,
      ...(!isProduction && { stack: err.stack }),
    });
  }
}
