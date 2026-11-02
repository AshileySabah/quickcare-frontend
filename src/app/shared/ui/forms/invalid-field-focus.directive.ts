import { DestroyRef, Directive, ElementRef, Injector, afterNextRender, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroupDirective } from '@angular/forms';

/** O que recebe o foco dentro do campo (os nossos componentes embrulham o input nativo). */
const FOCUSABLE = 'input:not([type="hidden"]):not([disabled]), textarea, select, button:not([disabled])';

/**
 * Leva a pessoa até o primeiro campo com erro do formulário: rola até ele
 * (centralizado) e põe o foco no controle. Os campos com formControlName
 * ganham `ng-invalid` do Angular; erros fora deles (ex.: anexos) aparecem
 * como alerta.
 */
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

/**
 * Em todo `<form [formGroup]>`: ao enviar com erro, marca todos os campos
 * como tocados (ficam vermelhos, com a mensagem) e leva até o primeiro. Quem
 * usa só precisa importar a diretiva; o `(ngSubmit)` da tela continua
 * decidindo o que fazer quando está válido.
 */
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
