import { Component, input, output, signal } from '@angular/core';
import { ACCEPTED_FILE_EXTENSIONS, fileSizeLabel, uploadError } from './file-rules';

let nextInputId = 0;

/** Seleção de um único arquivo (PDF, JPG ou PNG até 5MB), com as mesmas regras do back. */
@Component({
  selector: 'ui-file-picker',
  standalone: true,
  templateUrl: './file-picker.component.html',
  styleUrl: './file-picker.component.scss',
})
export class FilePickerComponent {
  label = input.required<string>();
  hint = input<string>('PDF, JPG ou PNG, até 5MB.');
  required = input(false);
  errorMessage = input<string | null>(null);
  disabled = input(false);

  fileChange = output<File | null>();

  protected readonly inputId = `ui-file-picker-${nextInputId++}`;
  protected readonly file = signal<File | null>(null);
  protected readonly localError = signal<string | null>(null);
  protected readonly accept = ACCEPTED_FILE_EXTENSIONS;
  protected readonly sizeLabel = fileSizeLabel;

  protected onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    const selected = element.files?.[0] ?? null;
    element.value = '';

    if (!selected) {
      return;
    }

    const error = uploadError(selected);
    if (error) {
      this.localError.set(error);
      return;
    }

    this.localError.set(null);
    this.file.set(selected);
    this.fileChange.emit(selected);
  }

  /** Também usado pelo componente pai para limpar depois de enviar. */
  clear(): void {
    this.file.set(null);
    this.localError.set(null);
    this.fileChange.emit(null);
  }
}
