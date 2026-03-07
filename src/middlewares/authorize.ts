import { NextFunction, Request, Response } from 'express';

export const authorize =
  (...allowedRoles: string[]) =>
  (_request: Request, _response: Response, next: NextFunction): void => {
    void allowedRoles;
    next();
  };
