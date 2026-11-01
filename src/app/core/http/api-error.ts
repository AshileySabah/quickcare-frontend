import { HttpErrorResponse } from '@angular/common/http';

/** Corpo de erro que a API devolve (ver ApiError no back). */
export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  message: string;
}

/** Usa a mensagem da API quando houver; senão, a mensagem padrão da operação. */
export function normalizeError(error: unknown, defaultMessage: string): Error {
  if (error instanceof HttpErrorResponse) {
    const apiError = error.error as ApiErrorResponse | undefined;
    return new Error(apiError?.message ?? defaultMessage);
  }

  return error instanceof Error ? error : new Error(defaultMessage);
}
