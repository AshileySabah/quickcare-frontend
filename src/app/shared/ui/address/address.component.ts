import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, filter, map, of, switchMap } from 'rxjs';
import { GridItemComponent } from '../grid/grid-item.component';
import { GridComponent } from '../grid/grid.component';
import { InputComponent } from '../input/input.component';

interface ViaCepResponse {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export interface AddressFormGroup {
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}

const AUTO_FILLED_FIELDS = ['street', 'neighborhood', 'city', 'state'] as const;

@Component({
  selector: 'ui-address',
  standalone: true,
  imports: [ReactiveFormsModule, GridComponent, GridItemComponent, InputComponent],
  templateUrl: './address.component.html',
  styleUrl: './address.component.scss',
})
export class AddressComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  group = input.required<FormGroup>();
  fieldError = input<(fieldName: string) => string | null>(() => null);

  protected readonly looking = signal(false);
  protected readonly lookupError = signal<string | null>(null);
  protected readonly autoFilled = signal(false);

  ngOnInit(): void {
    const cepControl = this.group().get('cep');

    cepControl?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.autoFilled()) {
        this.autoFilled.set(false);
        this.lookupError.set(null);
        this.setAutoFilledFieldsDisabled(false);
      }
    });

    cepControl?.valueChanges
      .pipe(
        map((value: string) => (value ?? '').replace(/\D/g, '')),
        distinctUntilChanged(),
        filter((digits) => digits.length === 8),
        debounceTime(300),
        switchMap((digits) => this.lookupCep(digits)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  protected cepHint(): string | null {
    if (this.looking()) {
      return 'Buscando endereço...';
    }

    return 'Digite o CEP para preencher o endereço automaticamente.';
  }

  private lookupCep(cep: string) {
    this.looking.set(true);
    this.lookupError.set(null);

    return this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${cep}/json/`).pipe(
      catchError(() => of(null)),
      map((response) => {
        this.looking.set(false);

        if (!response || response.erro) {
          this.lookupError.set('CEP não encontrado. Preencha o endereço manualmente.');
          this.autoFilled.set(false);
          this.setAutoFilledFieldsDisabled(false);
          return;
        }

        this.group().patchValue({
          street: response.logradouro,
          neighborhood: response.bairro,
          city: response.localidade,
          state: response.uf,
        });

        this.autoFilled.set(true);
        this.setAutoFilledFieldsDisabled(true);
      }),
    );
  }

  private setAutoFilledFieldsDisabled(disabled: boolean): void {
    for (const fieldName of AUTO_FILLED_FIELDS) {
      const control = this.group().get(fieldName);

      if (disabled) {
        control?.disable({ emitEvent: false });
      } else {
        control?.enable({ emitEvent: false });
      }
    }
  }
}
