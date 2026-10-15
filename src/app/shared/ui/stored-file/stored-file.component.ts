import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { StoredFile } from '../../../core/models';

/** Arquivo guardado no storage: nome, tamanho e link temporário para abrir. */
@Component({
  selector: 'ui-stored-file',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './stored-file.component.html',
  styleUrl: './stored-file.component.scss',
})
export class StoredFileComponent {
  file = input.required<StoredFile>();

  protected isImage(file: StoredFile): boolean {
    return file.contentType.startsWith('image/');
  }
}
