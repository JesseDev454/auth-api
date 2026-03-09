import { Router } from 'express';

import { asyncHandler } from '../../utils/asyncHandler';
import { healthController } from './health.controller';

export const healthRouter = Router();

healthRouter.get('/health', asyncHandler(healthController.getStatus.bind(healthController)));
healthRouter.get('/api/v1/health', asyncHandler(healthController.getStatus.bind(healthController)));
