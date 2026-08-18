import { Observable, of, throwError, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface SimulateNetworkOptions {
  delayMs?: number;
  simulateError?: boolean;
  errorMessage?: string;
}

const DEFAULT_DELAY_MS = 400;
const DEFAULT_ERROR_MESSAGE = 'Ocorreu um erro inesperado. Tente novamente.';

export function simulateNetwork<T>(factory: () => T, options: SimulateNetworkOptions = {}): Observable<T> {
  const { delayMs = DEFAULT_DELAY_MS, simulateError = false, errorMessage = DEFAULT_ERROR_MESSAGE } = options;

  return timer(delayMs).pipe(
    switchMap(() => {
      if (simulateError) {
        return throwError(() => new Error(errorMessage));
      }

      try {
        return of(factory());
      } catch (error) {
        return throwError(() => error);
      }
    }),
  );
}
