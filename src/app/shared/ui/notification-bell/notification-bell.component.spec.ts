import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AppNotification, SwitchableRole } from '../../../core/models';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationBellComponent } from './notification-bell.component';

function notification(id: string, read: boolean): AppNotification {
  return {
    id,
    profile: 'patient',
    type: 'proposta_recebida',
    title: `Notificação ${id}`,
    message: 'Mensagem',
    link: `/patient/solicitacoes/${id}`,
    read,
    createdAt: new Date().toISOString(),
  };
}

describe('NotificationBellComponent', () => {
  const activeRole = signal<SwitchableRole | null>('patient');
  const notifications = signal<AppNotification[]>([]);
  const fakeService = {
    activeRole,
    notifications,
    activeUnread: computed(() => notifications().filter((item) => !item.read).length),
    loading: signal(false),
    failed: signal(false),
    reload: jasmine.createSpy('reload'),
    markAsRead: jasmine.createSpy('markAsRead').and.returnValue(of(undefined)),
    markAllAsRead: jasmine.createSpy('markAllAsRead').and.returnValue(of(undefined)),
  };

  function render() {
    TestBed.configureTestingModule({
      imports: [NotificationBellComponent],
      providers: [provideRouter([]), { provide: NotificationService, useValue: fakeService }],
    });
    const fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    activeRole.set('patient');
    notifications.set([notification('1', false), notification('2', true)]);
    fakeService.reload.calls.reset();
    fakeService.markAsRead.calls.reset();
  });

  it('mostra as não lidas do perfil em uso no sino', () => {
    const element = render().nativeElement as HTMLElement;

    expect(element.querySelector('.notification-bell__badge')?.textContent?.trim()).toBe('1');
    expect(element.querySelector('.notification-bell__trigger')?.getAttribute('aria-label')).toBe(
      'Notificações: 1 não lida',
    );
  });

  it('abrir recarrega e lista; clicar marca como lida e navega', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl');

    (element.querySelector('.notification-bell__trigger') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fakeService.reload).toHaveBeenCalled();
    const items = element.querySelectorAll<HTMLButtonElement>('.notification-bell__item');
    expect(items.length).toBe(2);
    expect(items[0].classList).toContain('notification-bell__item--unread');

    items[0].click();
    expect(fakeService.markAsRead).toHaveBeenCalledWith(notifications()[0]);
    expect(navigate).toHaveBeenCalledWith('/patient/solicitacoes/1');
  });

  it('não aparece para quem não tem perfil de paciente nem de profissional', () => {
    activeRole.set(null);

    const element = render().nativeElement as HTMLElement;

    expect(element.querySelector('.notification-bell')).toBeNull();
  });
});
