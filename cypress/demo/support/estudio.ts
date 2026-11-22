import { TOKEN_KEY, session } from '../../support/api';
import { Sessao } from '../../support/factories';

export const RITMO = {
  digitacao: 35,
  depoisDoClique: 600,
  respiro: 1200,
  leitura: 2500,
};

interface Legenda {
  titulo: string;
  quem: string;
}

let legendaAtual: Legenda | null = null;

const LEGENDA_ID = 'demo-legenda';
const DESTAQUE_CLASSE = 'demo-destaque';

function desenharLegenda(doc: Document): void {
  doc.getElementById(LEGENDA_ID)?.remove();
  if (!legendaAtual || !doc.body) {
    return;
  }
  const caixa = doc.createElement('div');
  caixa.id = LEGENDA_ID;
  caixa.setAttribute('aria-hidden', 'true');
  Object.assign(caixa.style, {
    position: 'fixed',
    left: '32px',
    bottom: '32px',
    zIndex: '2147483647',
    pointerEvents: 'none',
    padding: '14px 22px',
    borderRadius: '14px',
    background: 'rgba(15, 23, 42, 0.86)',
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.35)',
    maxWidth: '640px',
  });
  const titulo = doc.createElement('div');
  titulo.textContent = legendaAtual.titulo;
  Object.assign(titulo.style, { fontSize: '20px', fontWeight: '700', lineHeight: '1.3' });
  const quem = doc.createElement('div');
  quem.textContent = legendaAtual.quem;
  Object.assign(quem.style, { fontSize: '15px', opacity: '0.82', marginTop: '4px' });
  caixa.append(titulo, quem);
  doc.body.appendChild(caixa);
}

export function legenda(titulo: string, quem: string): void {
  cy.document({ log: false }).then((doc) => {
    legendaAtual = { titulo, quem };
    desenharLegenda(doc);
  });
}

export function quem(texto: string): void {
  cy.document({ log: false }).then((doc) => {
    legendaAtual = { titulo: legendaAtual?.titulo ?? '', quem: texto };
    desenharLegenda(doc);
  });
}

export function pausa(ms = RITMO.respiro): void {
  cy.wait(ms, { log: false });
}

function destacar(alvo: JQuery<HTMLElement>): void {
  const elemento = alvo.get(0);
  if (!elemento || !elemento.isConnected) {
    return;
  }
  const doc = elemento.ownerDocument;
  const retangulo = elemento.getBoundingClientRect();
  if (retangulo.width === 0 && retangulo.height === 0) {
    return;
  }
  const anel = doc.createElement('div');
  anel.className = DESTAQUE_CLASSE;
  Object.assign(anel.style, {
    position: 'fixed',
    left: `${retangulo.left - 6}px`,
    top: `${retangulo.top - 6}px`,
    width: `${retangulo.width + 12}px`,
    height: `${retangulo.height + 12}px`,
    border: '3px solid #f59e0b',
    borderRadius: '10px',
    boxShadow: '0 0 0 6px rgba(245, 158, 11, 0.25)',
    pointerEvents: 'none',
    zIndex: '2147483646',
    transition: 'opacity 300ms ease',
  });
  doc.body.appendChild(anel);
  setTimeout(() => (anel.style.opacity = '0'), 700);
  setTimeout(() => anel.remove(), 1100);
}

Cypress.on('window:load', (win) => desenharLegenda(win.document));

Cypress.Commands.overwrite<'type', 'element'>('type', (original, elemento, texto, opcoes) =>
  original(elemento, texto, { ...opcoes, delay: RITMO.digitacao }),
);

Cypress.Commands.overwrite<'click', 'element'>('click', (original, elemento, ...args) => {
  elemento.get(0)?.scrollIntoView({ block: 'center', inline: 'nearest' });
  destacar(elemento);
  const resultado = original(elemento, ...args);
  return new Cypress.Promise((resolve) => setTimeout(() => resolve(resultado), RITMO.depoisDoClique)) as unknown as Cypress.Chainable;
});

interface Assinatura {
  id: string;
  destino: string;
}

class SocketDemo {
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
  bufferedAmount = 0;
  extensions = '';
  url: string;
  onopen: ((evento: unknown) => void) | null = null;
  onclose: ((evento: unknown) => void) | null = null;
  onerror: ((evento: unknown) => void) | null = null;
  onmessage: ((evento: { data: string }) => void) | null = null;
  private assinaturas: Assinatura[] = [];
  private sequencia = 0;

  constructor(url: string, private readonly central: CentralDemo) {
    this.url = url;
    central.sockets.add(this);
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.({});
    }, 20);
  }

  send(dados: string | ArrayBuffer): void {
    const texto = typeof dados === 'string' ? dados : new TextDecoder().decode(dados);
    texto
      .split('\0')
      .map((quadro) => quadro.replace(/^[\r\n]+/, ''))
      .filter((quadro) => quadro.length > 0)
      .forEach((quadro) => this.tratar(quadro));
  }

  assina(destino: string): boolean {
    return this.readyState === 1 && this.assinaturas.some((assinatura) => assinatura.destino === destino);
  }

  entregar(destino: string, corpo: unknown): void {
    if (this.readyState !== 1) {
      return;
    }
    this.assinaturas
      .filter((assinatura) => assinatura.destino === destino)
      .forEach((assinatura) => {
        this.sequencia += 1;
        this.responder(
          `MESSAGE\ndestination:${destino}\nsubscription:${assinatura.id}\nmessage-id:${this.sequencia}\ncontent-type:application/json\n\n${JSON.stringify(corpo)}`,
        );
      });
  }

  close(): void {
    if (this.readyState === 3) {
      return;
    }
    this.readyState = 3;
    this.central.sockets.delete(this);
    setTimeout(() => this.onclose?.({ code: 1000, reason: '', wasClean: true }), 0);
  }

  addEventListener(): void {}

  removeEventListener(): void {}

  private tratar(quadro: string): void {
    const [cabecalho] = quadro.split('\n\n');
    const [comando, ...linhas] = cabecalho.split('\n');
    const cabecalhos = Object.fromEntries(
      linhas
        .map((linha) => linha.split(':'))
        .filter((partes) => partes.length >= 2)
        .map(([chave, ...valor]) => [chave, valor.join(':')]),
    );
    if (comando === 'CONNECT' || comando === 'STOMP') {
      this.responder('CONNECTED\nversion:1.2\nheart-beat:0,0\n\n');
    } else if (comando === 'SUBSCRIBE') {
      this.assinaturas.push({ id: cabecalhos['id'], destino: cabecalhos['destination'] });
    } else if (comando === 'UNSUBSCRIBE') {
      this.assinaturas = this.assinaturas.filter((assinatura) => assinatura.id !== cabecalhos['id']);
    } else if (comando === 'DISCONNECT' && cabecalhos['receipt']) {
      this.responder(`RECEIPT\nreceipt-id:${cabecalhos['receipt']}\n\n`);
    }
  }

  private responder(quadro: string): void {
    setTimeout(() => this.onmessage?.({ data: `${quadro}\0` }), 0);
  }
}

class CentralDemo {
  readonly sockets = new Set<SocketDemo>();

  temAssinante(destino: string): boolean {
    return [...this.sockets].some((socket) => socket.assina(destino));
  }

  enviar(destino: string, corpo: unknown): void {
    this.sockets.forEach((socket) => socket.entregar(destino, corpo));
  }
}

type JanelaDemo = Cypress.AUTWindow & { __centralDemo?: CentralDemo };

function instalarSocket(janela: Cypress.AUTWindow): void {
  const central = new CentralDemo();
  (janela as JanelaDemo).__centralDemo = central;
  const Socket = class extends SocketDemo {
    constructor(url: string) {
      super(url, central);
    }
  };
  Object.defineProperty(janela, 'WebSocket', { value: Socket, configurable: true, writable: true });
}

export function entrar(caminho: string, sessao: Sessao): void {
  session(sessao);
  cy.visit(caminho, {
    onBeforeLoad(janela) {
      instalarSocket(janela);
      janela.localStorage.setItem(TOKEN_KEY, 'token-da-demo');
    },
  });
  pausa();
}

export function visitar(caminho: string): void {
  cy.visit(caminho, {
    onBeforeLoad(janela) {
      instalarSocket(janela);
      janela.localStorage.removeItem(TOKEN_KEY);
    },
  });
  pausa();
}

type Corpo = object | (() => object);

function aoVivo(destino: string, corpo: Corpo): void {
  cy.window({ log: false })
    .should((janela) => {
      expect((janela as JanelaDemo).__centralDemo?.temAssinante(destino), `inscrição em ${destino}`).to.equal(true);
    })
    .then((janela) => (janela as JanelaDemo).__centralDemo!.enviar(destino, typeof corpo === 'function' ? corpo() : corpo));
}

export function notificacaoAoVivo(corpo: Corpo): void {
  aoVivo('/user/queue/notificacoes', corpo);
}

export function mensagemAoVivo(corpo: Corpo): void {
  aoVivo('/user/queue/mensagens', corpo);
}
