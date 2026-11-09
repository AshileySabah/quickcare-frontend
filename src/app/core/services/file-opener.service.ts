import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { StoredFile } from '../models';

const REVOKE_AFTER_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class FileOpenerService {
  private readonly http = inject(HttpClient);

  canOpen(file: StoredFile): boolean {
    return !!file.path || !!file.url;
  }

  open(file: StoredFile, onError: (message: string) => void): void {
    if (!file.path) {
      if (file.url) {
        window.open(file.url, '_blank', 'noopener');
      }
      return;
    }

    const tab = window.open('', '_blank');
    this.http.get(`${environment.apiUrl}${file.path}`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (tab) {
          tab.location.href = url;
        } else {
          window.open(url, '_blank');
        }
        setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
      },
      error: () => {
        tab?.close();
        onError('Não foi possível abrir o arquivo. Tente novamente.');
      },
    });
  }
}
