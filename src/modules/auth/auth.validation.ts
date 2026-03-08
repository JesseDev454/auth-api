import { z } from 'zod';

import { AppError } from '../../utils/appError';

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
});

const verifyEmailSchema = z.object({
  token: z.string().trim().min(1),
});

const resendVerificationSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
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

export const parseRegisterRequest = (input: unknown) => parseOrThrow(registerSchema, input);

export const parseVerifyEmailRequest = (input: unknown) => parseOrThrow(verifyEmailSchema, input);

export const parseResendVerificationRequest = (input: unknown) =>
  parseOrThrow(resendVerificationSchema, input);

export const parseLoginRequest = (input: unknown) => parseOrThrow(loginSchema, input);
