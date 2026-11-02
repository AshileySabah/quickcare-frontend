import { DestroyRef, Directive, ElementRef, Injector, afterNextRender, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroupDirective } from '@angular/forms';

const FOCUSABLE = 'input:not([type="hidden"]):not([disabled]), textarea, select, button:not([disabled])';

export function revealFirstInvalid(form: HTMLElement): void {
  const field =
    form.querySelector<HTMLElement>('[formcontrolname].ng-invalid') ??
    form.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
  if (!field) {
    return;
  }
  field.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const target = field.matches(FOCUSABLE) ? field : field.querySelector<HTMLElement>(FOCUSABLE);
  target?.focus({ preventScroll: true });
}

@Directive({
  selector: 'form[formGroup]',
  standalone: true,
})
export class InvalidFieldFocusDirective {
  constructor() {
    const host = inject<ElementRef<HTMLFormElement>>(ElementRef);
    const formGroup = inject(FormGroupDirective);
    const injector = inject(Injector);

    formGroup.ngSubmit.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      if (formGroup.invalid) {
        formGroup.control.markAllAsTouched();
        afterNextRender(() => revealFirstInvalid(host.nativeElement), { injector });
      }
    });
  }
}
