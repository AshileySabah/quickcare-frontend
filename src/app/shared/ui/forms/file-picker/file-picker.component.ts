import { Component, input, output, signal } from '@angular/core';

const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

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

  protected onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    const selected = element.files?.[0] ?? null;
    element.value = '';

    if (!selected) {
      return;
    }

    if (!ACCEPTED_FILE_TYPES.includes(selected.type)) {
      this.localError.set(`Formato inválido para "${selected.name}". Envie um arquivo PDF, JPG ou PNG.`);
      return;
    }

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      this.localError.set(`O arquivo "${selected.name}" deve ter no máximo 5MB.`);
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
