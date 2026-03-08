import { z } from 'zod';

import { AppError } from '../../utils/appError';

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const updateUserRoleParamsSchema = z.object({
  id: z.string().uuid(),
});

const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'user']),
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

export const parseListUsersQuery = (input: unknown): { page: number; limit: number } => {
  const parsedQuery = parseOrThrow(listUsersQuerySchema, input);

  return {
    page: parsedQuery.page ?? 1,
    limit: parsedQuery.limit ?? 20,
  };
};

export const parseUpdateUserRoleParams = (input: unknown) =>
  parseOrThrow(updateUserRoleParamsSchema, input);

export const parseUpdateUserRoleRequest = (input: unknown) =>
  parseOrThrow(updateUserRoleSchema, input);
