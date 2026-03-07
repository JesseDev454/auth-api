import { NextFunction, Request, Response } from 'express';

export const authenticate = (_request: Request, _response: Response, next: NextFunction): void => {
  next();
};
