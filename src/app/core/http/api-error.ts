import { HttpErrorResponse } from '@angular/common/http';

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  message: string;
}

export function normalizeError(error: unknown, defaultMessage: string): Error {
  if (error instanceof HttpErrorResponse) {
    const apiError = error.error as ApiErrorResponse | undefined;
    return new Error(apiError?.message ?? defaultMessage);
  }

  return error instanceof Error ? error : new Error(defaultMessage);
}
