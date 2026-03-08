import { z } from 'zod';

import { AppError } from '../../utils/appError';

const sessionIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const parseOrThrow = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed.', {
      fieldErrors: result.error.flatten().fieldErrors,
      formErrors: result.error.flatten().formErrors,
    });
  }

  return result.data;
};

export const parseSessionIdParams = (input: unknown) => parseOrThrow(sessionIdParamsSchema, input);
