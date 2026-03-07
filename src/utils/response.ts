export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    details?: Record<string, unknown>;
  };
}

export const buildSuccessResponse = <T>(
  message: string,
  data: T,
  meta?: Record<string, unknown>,
): ApiSuccessResponse<T> => {
  return {
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  };
};

export const buildErrorResponse = (
  message: string,
  code: string,
  details?: Record<string, unknown>,
): ApiErrorResponse => {
  return {
    success: false,
    message,
    error: {
      code,
      ...(details ? { details } : {}),
    },
  };
};
