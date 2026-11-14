import { Injectable, signal } from '@angular/core';
import { Observable, Subject, take } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SessionExpiredService {
  private pending: Subject<boolean> | null = null;

  readonly open = signal(false);

  askToLogIn(): Observable<boolean> {
    if (!this.pending) {
      this.pending = new Subject<boolean>();
      this.open.set(true);
    }
    return this.pending.pipe(take(1));
  }

  finish(loggedIn: boolean): void {
    const pending = this.pending;
    this.pending = null;
    this.open.set(false);
    pending?.next(loggedIn);
    pending?.complete();
  }
}
