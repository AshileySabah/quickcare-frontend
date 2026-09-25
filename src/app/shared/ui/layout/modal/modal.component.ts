import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'ui-modal',
  standalone: true,
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class ModalComponent {
  open = input.required<boolean>();
  titleText = input.required<string>();

  closed = output<void>();

  private readonly dialogRef = viewChild<ElementRef<HTMLElement>>('dialog');

  protected readonly titleId = `ui-modal-title-${Math.random().toString(36).slice(2, 9)}`;

  constructor() {
    effect(() => {
      if (this.open()) {
        queueMicrotask(() => this.dialogRef()?.nativeElement.focus());
      }
    });
  }

  protected onBackdropClick(): void {
    this.close();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  protected close(): void {
    this.closed.emit();
  }
}
