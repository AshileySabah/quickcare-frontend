import { Sessao } from './factories';
import { TOKEN_KEY, session } from './api';

declare global {
  namespace Cypress {
    interface Chainable {
      visitAs(path: string, sessao: Sessao): Chainable<AUTWindow>;
      visitGuest(path: string): Chainable<AUTWindow>;
      field(label: string): Chainable<JQuery<HTMLElement>>;
      fillField(label: string, value: string): Chainable<JQuery<HTMLElement>>;
      selectField(label: string, value: string): Chainable<JQuery<HTMLElement>>;
      multiSelect(label: string, options: string[]): Chainable<JQuery<HTMLElement>>;
      button(text: string | RegExp): Chainable<JQuery<HTMLButtonElement>>;
      dialog(title: string): Chainable<JQuery<HTMLElement>>;
      toast(text: string | RegExp): Chainable<JQuery<HTMLElement>>;
      attachFile(label: string, fileName?: string, mimeType?: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function labelMatcher(label: string): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(label)}\\s*\\*?\\s*$`);
}

function installFakeWebSocket(win: Cypress.AUTWindow): void {
  class FakeWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;
    readyState = 0;
    binaryType = 'blob';
    protocol = '';
    url: string;
    onopen: ((event: unknown) => void) | null = null;
    onclose: ((event: unknown) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    onmessage: ((event: unknown) => void) | null = null;

    constructor(url: string) {
      this.url = url;
    }

    send(): void {}

    close(): void {
      if (this.readyState === 3) {
        return;
      }
      this.readyState = 3;
      setTimeout(() => this.onclose?.({ code: 1000, reason: '', wasClean: true }), 0);
    }

    addEventListener(): void {}

    removeEventListener(): void {}
  }
  Object.defineProperty(win, 'WebSocket', { value: FakeWebSocket, configurable: true, writable: true });
}

Cypress.Commands.add('visitAs', (path: string, sessao: Sessao) => {
  session(sessao);
  return cy.visit(path, {
    onBeforeLoad(win) {
      installFakeWebSocket(win);
      win.localStorage.setItem(TOKEN_KEY, 'token-de-teste');
    },
  });
});

Cypress.Commands.add('visitGuest', (path: string) => {
  return cy.visit(path, {
    onBeforeLoad(win) {
      installFakeWebSocket(win);
      win.localStorage.removeItem(TOKEN_KEY);
    },
  });
});

Cypress.Commands.add('field', (label: string) => {
  return cy
    .contains('label', labelMatcher(label))
    .first()
    .invoke('attr', 'for')
    .then((id) => cy.get(`[id="${id}"]`));
});

Cypress.Commands.add('fillField', (label: string, value: string) => {
  return cy.field(label).clear().type(value, { delay: 0 });
});

Cypress.Commands.add('selectField', (label: string, value: string) => {
  return cy.field(label).select(value);
});

Cypress.Commands.add('multiSelect', (label: string, options: string[]) => {
  cy.contains('label', labelMatcher(label)).first().parent().find('[role="combobox"]').click();
  options.forEach((option) => cy.contains('[role="option"]', option).click());
  return cy.contains('label', labelMatcher(label)).first().parent().find('[role="combobox"]').click();
});

Cypress.Commands.add('button', (text: string | RegExp) => {
  return cy.contains('button', text);
});

Cypress.Commands.add('dialog', (title: string) => {
  return cy.contains('[role="dialog"] .ui-modal__title', title).closest('[role="dialog"]');
});

Cypress.Commands.add('toast', (text: string | RegExp) => {
  return cy.contains('.ui-toast', text);
});

Cypress.Commands.add('attachFile', (label: string, fileName = 'documento.pdf', mimeType = 'application/pdf') => {
  return cy
    .contains('.ui-file-picker__label', labelMatcher(label))
    .closest('.ui-file-picker')
    .find('input[type="file"]')
    .selectFile({ contents: Cypress.Buffer.from('%PDF-1.4 teste'), fileName, mimeType }, { force: true });
});

export {};
