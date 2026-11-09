import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  CreationLock,
  CreationLockService,
} from '../../../core/services/creation-lock.service';
import { BlockedNoticeComponent } from './blocked-notice.component';

describe('BlockedNoticeComponent', () => {
  function render(
    lock: CreationLock | null,
    role: 'patient' | 'professional' = 'patient',
  ) {
    TestBed.configureTestingModule({
      imports: [BlockedNoticeComponent],
      providers: [
        provideRouter([]),
        {
          provide: CreationLockService,
          useValue: { lockFor: () => signal(lock) },
        },
      ],
    });
    const fixture = TestBed.createComponent(BlockedNoticeComponent);
    fixture.componentRef.setInput('role', role);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('em revalidação, mostra o botão que leva para Documentos', () => {
    const element = render({ reason: 'revalidation' }, 'professional');

    expect(element.querySelector('ui-button')?.textContent).toContain(
      'Documentos',
    );
  });

  it('bloqueado por ocorrências, não mostra o botão de Documentos', () => {
    const element = render({
      reason: 'occurrences',
      block: {
        id: '1',
        level: 1,
        start: '2026-11-01T10:00:00Z',
        end: '2026-11-10T10:00:00Z',
        active: true,
        undone: false,
      },
    });

    expect(element.textContent).not.toContain('Documentos');
  });
});
