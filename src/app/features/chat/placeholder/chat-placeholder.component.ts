import { Component } from '@angular/core';

/** Mostrado ao lado da lista quando nenhuma conversa esta aberta. */
@Component({
  selector: 'app-chat-placeholder',
  standalone: true,
  template: `
    <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
      <path d="M8.5 11h7M8.5 14h4" />
    </svg>
    <h2>Selecione uma conversa</h2>
    <p>Escolha uma conversa na lista para ver as mensagens e conversar.</p>
  `,
  styles: `
    :host {
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 24px;
      text-align: center;
      color: #6b7280;
      background: rgba(11, 90, 70, 0.04);
    }

    svg {
      color: #0b5a46;
      opacity: 0.55;
    }

    h2 {
      font-size: 1.125rem;
      font-weight: 500;
      color: #111827;
    }
  `,
})
export class ChatPlaceholderComponent {}
