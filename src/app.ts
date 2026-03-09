import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './config/swagger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { globalRateLimiter } from './middlewares/rateLimiter';
import { requestLogger } from './middlewares/requestLogger';
import { adminRouter } from './modules/admin/admin.routes';
import { authRouter } from './modules/auth/auth.routes';
import { healthRouter } from './modules/health/health.routes';
import { userRouter } from './modules/users/user.routes';

export const createApp = (): Application => {
  const app = express();

  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);
  app.use(globalRateLimiter);

  app.use(healthRouter);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
