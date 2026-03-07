import { NextFunction, Request, Response } from 'express';

export const requestLogger = (request: Request, response: Response, next: NextFunction): void => {
  const startedAt = Date.now();

  response.on('finish', () => {
    const durationInMs = Date.now() - startedAt;
    console.info(
      `[${new Date().toISOString()}] ${request.method} ${request.originalUrl} ${response.statusCode} ${durationInMs}ms`,
    );
  });

  next();
};
