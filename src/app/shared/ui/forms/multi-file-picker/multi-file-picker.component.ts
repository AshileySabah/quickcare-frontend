import { Component, computed, input, output, signal } from '@angular/core';
import { ACCEPTED_FILE_EXTENSIONS, fileSizeLabel, uploadError } from '../file-picker/file-rules';

let nextInputId = 0;

/**
 * Vários arquivos (até `max`), com as mesmas regras e o mesmo visual do
 * `ui-file-picker`: a lista dos escolhidos, remover cada um e o botão
 * enquanto couber mais.
 */
@Component({
  selector: 'ui-multi-file-picker',
  standalone: true,
  templateUrl: './multi-file-picker.component.html',
  styleUrl: '../file-picker/file-picker.component.scss',
})
export class MultiFilePickerComponent {
  label = input.required<string>();
  max = input(3);
  hint = input<string | null>(null);
  disabled = input(false);

  filesChange = output<File[]>();

  protected readonly inputId = `ui-multi-file-picker-${nextInputId++}`;
  protected readonly files = signal<File[]>([]);
  protected readonly localError = signal<string | null>(null);
  protected readonly accept = ACCEPTED_FILE_EXTENSIONS;
  protected readonly sizeLabel = fileSizeLabel;
  protected readonly full = computed(() => this.files().length >= this.max());
  protected readonly hintText = computed(
    () => this.hint() ?? `Até ${this.max()} arquivos PDF, JPG ou PNG, de até 5MB cada.`,
  );

  protected onFilesSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    const selected = Array.from(element.files ?? []);
    element.value = '';

    const room = this.max() - this.files().length;
    const invalid = selected.map(uploadError).find((error) => error !== null);
    if (invalid) {
      this.localError.set(invalid);
      return;
    }
    if (selected.length > room) {
      this.localError.set(`Escolha no máximo ${this.max()} arquivos.`);
      return;
    }

    this.localError.set(null);
    this.update([...this.files(), ...selected]);
  }

  protected remove(index: number): void {
    this.update(this.files().filter((_, position) => position !== index));
  }

  /** Para o componente pai limpar depois de enviar. */
  clear(): void {
    this.localError.set(null);
    this.update([]);
  }

  private update(files: File[]): void {
    this.files.set(files);
    this.filesChange.emit(files);
  }
}
