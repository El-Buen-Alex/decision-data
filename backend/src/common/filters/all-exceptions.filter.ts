import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();

    const isKnownHttpException = exception instanceof HttpException;
    const statusCode = isKnownHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.resolveMessage(exception, isKnownHttpException);

    const envelope: ApiResponse<null> = {
      status: 'error',
      message,
      data: null,
    };

    response.status(statusCode).json(envelope);
  }

  private resolveMessage(
    exception: unknown,
    isKnownHttpException: boolean,
  ): string {
    if (!isKnownHttpException) {
      return 'Ocurrió un error inesperado.';
    }

    const httpException = exception as HttpException;
    const response = httpException.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    const responseObject = response as { message?: string | string[] };
    if (Array.isArray(responseObject.message)) {
      return responseObject.message.join(' ');
    }

    return responseObject.message ?? httpException.message;
  }
}
