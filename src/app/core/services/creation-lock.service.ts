import { Injectable, Signal, computed, inject } from '@angular/core';
import { Ban, Block, SwitchableRole } from '../models';
import { BanService } from './ban.service';
import { OccurrenceService } from './occurrence.service';
import { ValidationService } from './validation.service';

export type CreationLock =
  | { reason: 'ban'; ban: Ban }
  | { reason: 'occurrences'; block: Block }
  | { reason: 'revalidation' };

@Injectable({ providedIn: 'root' })
export class CreationLockService {
  private readonly occurrenceService = inject(OccurrenceService);
  private readonly validationService = inject(ValidationService);
  private readonly banService = inject(BanService);

  lockFor(role: SwitchableRole): Signal<CreationLock | null> {
    const ban = this.banService.banFor(role);
    const block = this.occurrenceService.blockFor(role);
    const revalidating = this.validationService.revalidatingFor(role);
    return computed(() => {
      const currentBan = ban();
      if (currentBan) {
        return { reason: 'ban', ban: currentBan };
      }
      const current = block();
      if (current) {
        return { reason: 'occurrences', block: current };
      }
      return revalidating() ? { reason: 'revalidation' } : null;
    });
  }
}
