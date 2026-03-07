import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';

import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { authRateLimiter, globalRateLimiter } from './middlewares/rateLimiter';
import { requestLogger } from './middlewares/requestLogger';
import { adminRouter } from './modules/admin/admin.routes';
import { authRouter } from './modules/auth/auth.routes';
import { userRouter } from './modules/users/user.routes';
import { buildSuccessResponse } from './utils/response';

export const createApp = (): Application => {
  const app = express();

  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);
  app.use(globalRateLimiter);

  app.get('/api/v1/health', (_request, response) => {
    response.status(200).json(
      buildSuccessResponse('Authentication API is running.', {
        status: 'ok',
      }),
    );
  });

  app.use('/api/v1/auth', authRateLimiter, authRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
