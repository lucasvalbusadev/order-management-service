import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import {
  DomainError,
  OrderNotFoundError,
  InvalidStatusTransitionError,
  InvalidOrderError,
} from '../../../domain/errors/domain-errors';
import { ILogger } from '../../../application/ports/logger.port';

export function buildErrorHandler(logger: ILogger) {
  return function errorHandler(
    error: FastifyError | Error,
    request: FastifyRequest,
    reply: FastifyReply,
  ): void {
    if (error instanceof ZodError) {
      reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    if (error instanceof OrderNotFoundError) {
      reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message,
      });
      return;
    }

    if (error instanceof InvalidStatusTransitionError) {
      reply.status(422).send({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: error.message,
      });
      return;
    }

    if (error instanceof InvalidOrderError || error instanceof DomainError) {
      reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      });
      return;
    }

    const fastifyError = error as FastifyError;
    if (fastifyError.statusCode && fastifyError.statusCode < 500) {
      reply.status(fastifyError.statusCode).send({
        statusCode: fastifyError.statusCode,
        error: 'Bad Request',
        message: error.message,
      });
      return;
    }

    logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    });

    reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  };
}
