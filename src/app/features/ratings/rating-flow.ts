import { Signal, computed, inject, signal } from '@angular/core';
import { PendingRating, PendingRatings, RatingHighlight, RatingInput, SwitchableRole } from '../../core/models';
import { RatingService } from '../../core/services/rating.service';
import { ToastService } from '../../shared/ui/feedback/toast/toast.service';

export interface RatingFlow {
  pending: Signal<PendingRating[]>;
  highlights: Signal<RatingHighlight[]>;
  current: Signal<PendingRating | null>;
  sending: Signal<boolean>;
  load: (onLoaded?: (pending: PendingRating[]) => void) => void;
  open: (item: PendingRating) => void;
  close: () => void;
  submit: (rating: RatingInput) => void;
}

export function createRatingFlow(role: () => SwitchableRole): RatingFlow {
  const ratingService = inject(RatingService);
  const toastService = inject(ToastService);

  const data = signal<PendingRatings | null>(null);
  const current = signal<PendingRating | null>(null);
  const sending = signal(false);

  const pending = computed(() => data()?.pending ?? []);
  const highlights = computed(() => data()?.highlights ?? []);

  return {
    pending,
    highlights,
    current: current.asReadonly(),
    sending: sending.asReadonly(),
    load: (onLoaded) =>
      ratingService.pending(role()).subscribe({
        next: (result) => {
          data.set(result);
          onLoaded?.(result.pending);
        },
        error: () => data.set(null),
      }),
    open: (item) => current.set(item),
    close: () => {
      if (!sending()) {
        current.set(null);
      }
    },
    submit: (rating) => {
      const item = current();
      if (!item) {
        return;
      }
      sending.set(true);
      ratingService.rate(item.attendanceId, rating).subscribe({
        next: (result) => {
          sending.set(false);
          data.set(result);
          current.set(null);
          toastService.success('Avaliação enviada. Obrigado por contar como foi.');
        },
        error: (error: Error) => {
          sending.set(false);
          toastService.error(error.message);
        },
      });
    },
  };
}
