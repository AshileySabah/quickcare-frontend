import { Component, inject, input, model, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminProfileSummary, SwitchableRole } from '../../../core/models';
import { AdminProfileService } from '../../../core/services/admin/admin-profile.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';

const MAX_RESULTS = 5;

@Component({
  selector: 'app-admin-person-picker',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, InputComponent],
  templateUrl: './admin-person-picker.component.html',
  styleUrl: './admin-person-picker.component.scss',
})
export class AdminPersonPickerComponent {
  private readonly profileService = inject(AdminProfileService);

  role = input.required<SwitchableRole>();
  label = input.required<string>();
  errorMessage = input<string | null>(null);
  readonly selected = model<AdminProfileSummary | null>(null);

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly results = signal<AdminProfileSummary[]>([]);

  constructor() {
    this.search.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) =>
          term.trim().length < 2
            ? of([])
            : this.profileService
                .list({ situation: 'todos', role: this.role(), search: term })
                .pipe(catchError(() => of([]))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((profiles) => this.results.set(profiles.slice(0, MAX_RESULTS)));
  }

  protected choose(profile: AdminProfileSummary): void {
    this.selected.set(profile);
    this.results.set([]);
    this.search.setValue('', { emitEvent: false });
  }
}
