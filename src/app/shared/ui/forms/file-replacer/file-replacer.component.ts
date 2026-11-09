import { Component, input, output, signal } from '@angular/core';
import { StoredFile } from '../../../../core/models';
import { IconComponent } from '../../icon/icon.component';
import { StoredFileComponent } from '../../stored-file/stored-file.component';
import { FilePickerComponent } from '../file-picker/file-picker.component';

@Component({
  selector: 'ui-file-replacer',
  standalone: true,
  imports: [FilePickerComponent, IconComponent, StoredFileComponent],
  templateUrl: './file-replacer.component.html',
  styleUrl: './file-replacer.component.scss',
})
export class FileReplacerComponent {
  label = input.required<string>();
  current = input<StoredFile | null>(null);
  hint = input<string>('PDF, JPG ou PNG, até 5MB.');
  required = input(false);
  errorMessage = input<string | null>(null);
  disabled = input(false);

  fileChange = output<File | null>();

  protected readonly replacing = signal(false);

  protected replace(): void {
    this.replacing.set(true);
  }

  protected onPicked(file: File | null): void {
    if (!file) {
      this.replacing.set(false);
    }
    this.fileChange.emit(file);
  }
}
