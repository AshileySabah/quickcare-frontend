import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { StoredFile } from '../../../core/models';
import { FileOpenerService } from '../../../core/services/file-opener.service';
import { ToastService } from '../feedback/toast/toast.service';

@Component({
  selector: 'ui-stored-file',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './stored-file.component.html',
  styleUrl: './stored-file.component.scss',
})
export class StoredFileComponent {
  private readonly fileOpener = inject(FileOpenerService);
  private readonly toastService = inject(ToastService);

  file = input.required<StoredFile>();

  protected readonly canOpen = computed(() => this.fileOpener.canOpen(this.file()));
  protected readonly thumbnailUrl = computed(() => {
    const file = this.file();
    return file.contentType.startsWith('image/') ? file.url : null;
  });
  protected readonly kindLabel = computed(() => (this.file().contentType.startsWith('image/') ? 'IMG' : 'PDF'));

  protected open(): void {
    this.fileOpener.open(this.file(), (message) => this.toastService.error(message));
  }
}
