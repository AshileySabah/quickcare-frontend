import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { Conversation } from '../../../core/chat/chat.model';
import { ChatService } from '../../../core/chat/chat.service';
import { channelSegment } from '../../../core/chat/chat.utils';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/ui/feedback/skeleton/skeleton.component';

type ViewState = 'loading' | 'error' | 'none';

/**
 * Porta de entrada "Conversar" de uma solicitacao (/mensagens/:solicitacaoId): escolhe o canal
 * e redireciona. O paciente cai no grupo, quando existe, ou na conversa com o profissional; o
 * profissional cai na conversa individual com o paciente.
 */
@Component({
  selector: 'app-chat-open',
  standalone: true,
  imports: [RouterLink, ButtonComponent, EmptyStateComponent, ErrorStateComponent, SkeletonComponent],
  template: `
    @switch (viewState()) {
      @case ('loading') {
        <div class="open"><ui-skeleton height="56px"></ui-skeleton></div>
      }
      @case ('error') {
        <div class="open"><ui-error-state (retry)="load()"></ui-error-state></div>
      }
      @case ('none') {
        <div class="open">
          <ui-empty-state
            title="Conversa indisponível"
            message="Você não participa de nenhuma conversa desta solicitação."
          >
            <ui-button [routerLink]="basePath">Voltar às mensagens</ui-button>
          </ui-empty-state>
        </div>
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex: 1;
      min-width: 0;
    }

    .open {
      margin: auto;
      padding: 24px;
      width: 100%;
      max-width: 420px;
    }
  `,
})
export class ChatOpenComponent {
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly meId = Number(this.authService.currentUser()?.id);

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly basePath =
    this.authService.role() === 'professional' ? '/professional/mensagens' : '/patient/mensagens';

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(() => this.load());
  }

  protected load(): void {
    const requestId = Number(this.route.snapshot.paramMap.get('solicitacaoId'));
    this.viewState.set('loading');

    this.chatService.conversations(this.meId).subscribe({
      next: (items) => {
        const target = this.pick(items.filter((item) => item.requestId === requestId));
        if (!target) {
          this.viewState.set('none');
          return;
        }
        void this.router.navigate([this.basePath, requestId, channelSegment(target.professionalUserId)], {
          replaceUrl: true,
        });
      },
      error: () => this.viewState.set('error'),
    });
  }

  private pick(options: Conversation[]): Conversation | undefined {
    const isProfessional = this.authService.role() === 'professional';
    const group = options.find((item) => item.isGroup);
    const individual = options.find((item) => !item.isGroup);
    return isProfessional ? (individual ?? group) : (group ?? individual);
  }
}
