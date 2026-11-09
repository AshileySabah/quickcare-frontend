import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { homeRouteFor } from '../../../core/auth/home-route';
import { SecurityOverview, SecurityProfile, SwitchableRole, User } from '../../../core/models';
import { SecurityService } from '../../../core/services/security.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { BlockedUsersComponent } from '../../user-blocks/blocked-users/blocked-users.component';
import { CloseAccountDialogComponent, ClosureResult } from '../close-account-dialog/close-account-dialog.component';
import { EmailChangeCardComponent } from '../email-change-card/email-change-card.component';
import { PasswordChangeCardComponent } from '../password-change-card/password-change-card.component';

const ROLE_LABELS: Record<SwitchableRole, string> = {
  patient: 'paciente',
  professional: 'profissional',
};

@Component({
  selector: 'app-security-page',
  standalone: true,
  imports: [
    DatePipe,
    BlockedUsersComponent,
    ButtonComponent,
    CardComponent,
    CloseAccountDialogComponent,
    ConfirmDialogComponent,
    EmailChangeCardComponent,
    ErrorStateComponent,
    PasswordChangeCardComponent,
    SkeletonListComponent,
  ],
  templateUrl: './security-page.component.html',
  styleUrls: ['./security-page.component.scss', '../security-card.scss'],
})
export class SecurityPageComponent {
  private readonly securityService = inject(SecurityService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly role: SwitchableRole = inject(ActivatedRoute).snapshot.data['role'];
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly overview = signal<SecurityOverview | null>(null);
  protected readonly closing = signal(false);
  protected readonly toRecover = signal<SecurityProfile | null>(null);
  protected readonly recovering = signal(false);

  protected readonly activeRoles = computed<SwitchableRole[]>(() =>
    (this.overview()?.profiles ?? []).filter((profile) => !profile.closed).map((profile) => profile.role),
  );
  protected readonly closedProfiles = computed(() => (this.overview()?.profiles ?? []).filter((profile) => profile.closed));

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.securityService.overview().subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  protected onEmailChanged(user: User): void {
    this.overview.update((current) => (current ? { ...current, email: user.email } : current));
  }

  protected onClosed(result: ClosureResult): void {
    this.closing.set(false);
    if (!result.user) {
      this.toastService.success('Conta encerrada. Você tem 30 dias para recuperá-la pelo login ou pelo link do e-mail.', 8000);
      this.router.navigateByUrl('/login');
      return;
    }
    this.toastService.success(
      `Perfil de ${ROLE_LABELS[result.target as SwitchableRole]} encerrado. Você pode recuperá-lo por 30 dias aqui em Segurança.`,
      8000,
    );
    this.router.navigateByUrl(homeRouteFor(result.user));
  }

  protected recoverMessage(): string {
    const profile = this.toRecover();
    return profile ? `Recuperar seu perfil de ${ROLE_LABELS[profile.role]}?` : '';
  }

  protected readonly recoverConsequences = [
    'O perfil volta a aparecer e você pode usá-lo normalmente.',
    'Denúncias, disputas, ocorrências, bloqueios e banimentos que estavam congelados voltam a valer, com o tempo que faltava.',
    'O que foi cancelado no encerramento não volta.',
  ];

  protected recover(): void {
    const profile = this.toRecover();
    if (!profile) {
      return;
    }
    this.recovering.set(true);
    this.securityService.recoverProfile(profile.role).subscribe({
      next: (user) => {
        this.recovering.set(false);
        this.toRecover.set(null);
        this.toastService.success(`Perfil de ${ROLE_LABELS[profile.role]} recuperado.`);
        this.router.navigateByUrl(homeRouteFor(user));
      },
      error: (error: Error) => {
        this.recovering.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
