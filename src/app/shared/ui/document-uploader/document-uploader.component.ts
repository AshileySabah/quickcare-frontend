import { Component, computed, effect, input, output, signal } from '@angular/core';
import { SelectOption } from '../select/select.component';

const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export interface UploadedDocument {
  file: File;
  type: string;
}

interface DocumentEntry {
  id: number;
  file: File;
  type: string;
  previewUrl: string | null;
}

let nextEntryId = 0;
let nextInputId = 0;

@Component({
  selector: 'ui-document-uploader',
  standalone: true,
  templateUrl: './document-uploader.component.html',
  styleUrl: './document-uploader.component.scss',
})
export class DocumentUploaderComponent {
  label = input.required<string>();
  hint = input<string>('PDF, JPG ou PNG, até 5MB cada.');
  typeOptions = input.required<SelectOption[]>();
  errorMessage = input<string | null>(null);

  documentsChange = output<UploadedDocument[]>();

  protected readonly inputId = `ui-document-uploader-${nextInputId++}`;
  protected readonly entries = signal<DocumentEntry[]>([]);
  protected readonly localError = signal<string | null>(null);

  /**
   * Every option except "Outro" is a document the backend requires before the
   * cadastro is accepted — mirrored here as a checklist so the user sees
   * exactly what's missing, the same way the password requirements checklist
   * shows what's still unmet.
   */
  protected readonly requiredOptions = computed(() => this.typeOptions().filter((option) => option.value !== 'OUTRO'));

  protected readonly requiredStatus = computed(() =>
    this.requiredOptions().map((option) => ({
      ...option,
      met: this.entries().some((entry) => entry.type === option.value),
    })),
  );

  constructor() {
    effect(() => {
      const documents = this.entries().map((entry) => ({ file: entry.file, type: entry.type }));
      this.documentsChange.emit(documents);
    });
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    for (const file of files) {
      this.addFile(file);
    }
  }

  private addFile(file: File): void {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      this.localError.set(`Formato inválido para "${file.name}". Envie um arquivo PDF, JPG ou PNG.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.localError.set(`O arquivo "${file.name}" deve ter no máximo 5MB.`);
      return;
    }

    this.localError.set(null);

    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    // The first document is almost always the identity/CPF proof, so it's preselected
    // to save a click. Every document after that starts blank — the user must choose
    // its type explicitly rather than have us guess.
    const defaultType = this.entries().length === 0 ? 'VALIDACAO_CPF' : '';

    this.entries.update((current) => [...current, { id: nextEntryId++, file, type: defaultType, previewUrl }]);
  }

  protected updateType(id: number, type: string): void {
    this.entries.update((current) => current.map((entry) => (entry.id === id ? { ...entry, type } : entry)));
  }

  protected removeEntry(id: number): void {
    const entry = this.entries().find((candidate) => candidate.id === id);
    if (entry?.previewUrl) {
      URL.revokeObjectURL(entry.previewUrl);
    }
    this.entries.update((current) => current.filter((candidate) => candidate.id !== id));
  }
}
