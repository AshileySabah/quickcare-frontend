import { HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

export const TOKEN_HEADER = 'X-Auth-Token';

const TOKEN_KEY = 'quickcare.token';

@Injectable({ providedIn: 'root' })
export class AuthTokenStore {
  token(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  authorization(): string | null {
    const token = this.token();
    return token ? `Bearer ${token}` : null;
  }

  saveFrom(headers: HttpHeaders): void {
    const token = headers.get(TOKEN_HEADER);
    if (!token) {
      return;
    }
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      return;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      return;
    }
  }
}
