import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

interface FlagsApi {
  displayPreValidacao?: unknown;
}

export const FLAGS_URL = '/api/flags';

@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  private readonly http = inject(HttpClient);
  private readonly displayPreValidationSignal = signal(true);

  readonly displayPreValidation = this.displayPreValidationSignal.asReadonly();

  constructor() {
    this.http.get<FlagsApi>(FLAGS_URL).subscribe({
      next: (flags) => this.displayPreValidationSignal.set(flags?.displayPreValidacao !== false),
      error: () => undefined,
    });
  }
}
