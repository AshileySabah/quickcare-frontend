import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

let nextId = 0;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSignal = signal<Toast[]>([]);
  readonly toasts = this.toastsSignal.asReadonly();

  show(message: string, variant: ToastVariant = 'info', durationMs = 4000): number {
    const id = nextId++;
    this.toastsSignal.update((toasts) => [...toasts, { id, message, variant }]);

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }

    return id;
  }

  success(message: string, durationMs = 4000): number {
    return this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs = 4000): number {
    return this.show(message, 'error', durationMs);
  }

  warning(message: string, durationMs = 4000): number {
    return this.show(message, 'warning', durationMs);
  }

  info(message: string, durationMs = 4000): number {
    return this.show(message, 'info', durationMs);
  }

  dismiss(id: number): void {
    this.toastsSignal.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }
}
