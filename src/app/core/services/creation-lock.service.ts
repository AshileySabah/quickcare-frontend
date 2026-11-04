import { Injectable, Signal, computed, inject } from '@angular/core';
import { Block, SwitchableRole } from '../models';
import { OccurrenceService } from './occurrence.service';
import { ValidationService } from './validation.service';

export type CreationLock = { reason: 'occurrences'; block: Block } | { reason: 'revalidation' };

@Injectable({ providedIn: 'root' })
export class CreationLockService {
  private readonly occurrenceService = inject(OccurrenceService);
  private readonly validationService = inject(ValidationService);

  lockFor(role: SwitchableRole): Signal<CreationLock | null> {
    const block = this.occurrenceService.blockFor(role);
    const revalidating = this.validationService.revalidatingFor(role);
    return computed(() => {
      const current = block();
      if (current) {
        return { reason: 'occurrences', block: current };
      }
      return revalidating() ? { reason: 'revalidation' } : null;
    });
  }
}
