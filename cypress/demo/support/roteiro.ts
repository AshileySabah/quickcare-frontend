import { route } from '../../support/api';
import { arquivo, etapa, inDays, preValidacao } from '../../support/factories';
import {
  ATUACAO_RAFAEL,
  CNPJ_RAFAEL,
  ENDERECO_MARIANA,
  MARIANA,
  Pessoa,
  RAFAEL,
  SOLICITACAO_ID,
  conversaGrupo,
  conversaIndividual,
  mensagemDe,
} from './elenco';

type Etapa = ReturnType<typeof etapa>;
type PerfilValidado = 'PACIENTE' | 'PROFISSIONAL';

export function textoDoCorpo(corpo: unknown): string {
  if (typeof corpo === 'string') {
    return corpo;
  }
  if (corpo instanceof ArrayBuffer) {
    return new TextDecoder().decode(corpo);
  }
  if (ArrayBuffer.isView(corpo)) {
    return new TextDecoder().decode(corpo as Uint8Array);
  }
  return JSON.stringify(corpo ?? '');
}

function arquivoDeHoje(nome: string) {
  return { ...arquivo(nome), enviadoEm: new Date().toISOString() };
}

export function etapasIniciais(pessoa: Pessoa): Etapa[] {
  const pendente = { status: 'PENDENTE', justificativa: null, avaliadoPor: null, avaliadoEm: null, criadoEm: inDays(0) };
  const sufixo = pessoa === RAFAEL ? 'rafael' : 'mariana';
  const etapas = [
    etapa({ id: 1, tipo: 'CPF', descricao: 'CPF', documento: arquivoDeHoje(`cpf-${sufixo}.pdf`), ...pendente }),
    etapa({ id: 2, tipo: 'IDENTIDADE', descricao: 'Documento de identidade', documento: arquivoDeHoje(`rg-${sufixo}.pdf`), ...pendente }),
  ];
  if (pessoa === RAFAEL) {
    etapas.push(
      etapa({
        id: 3,
        tipo: 'REGISTRO_PROFISSIONAL',
        descricao: 'Registro profissional',
        atuacao: ATUACAO_RAFAEL,
        documento: arquivoDeHoje('coren-rafael.pdf'),
        ...pendente,
      }),
      etapa({ id: 4, tipo: 'CNPJ', descricao: 'CNPJ', documento: arquivoDeHoje('cartao-cnpj-rafael.pdf'), ...pendente }),
    );
  }
  return etapas;
}

function dadosDe(pessoa: Pessoa) {
  return {
    nome: pessoa.nome,
    email: pessoa.email,
    telefone: pessoa === RAFAEL ? '11976543210' : '11987654321',
    avatarUrl: null,
    cpf: pessoa === RAFAEL ? '40442820135' : '52998224725',
    dataNascimento: pessoa === RAFAEL ? '1991-08-22' : '1991-03-14',
    genero: pessoa === RAFAEL ? 'MASCULINO' : 'FEMININO',
    documentoIdentidadeTipo: 'RG',
    documentoIdentidadeNumero: '123456782',
    documentoIdentidadeUf: 'SP',
    ...ENDERECO_MARIANA,
    atuacoes: pessoa === RAFAEL ? [ATUACAO_RAFAEL] : null,
    cnpj: pessoa === RAFAEL ? CNPJ_RAFAEL : null,
  };
}

function statusGeral(etapas: Etapa[]): 'PENDENTE' | 'APROVADO' | 'REPROVADO' {
  if (etapas.some((item) => item.status === 'REPROVADA')) {
    return 'REPROVADO';
  }
  return etapas.every((item) => item.status === 'APROVADA') ? 'APROVADO' : 'PENDENTE';
}

export class ValidacaoAoVivo {
  private readonly etapas: Etapa[];

  constructor(
    private readonly pessoa: Pessoa,
    private readonly perfil: PerfilValidado,
    etapas: Etapa[] = etapasIniciais(pessoa),
  ) {
    this.etapas = etapas;
  }

  detalhe() {
    return {
      id: this.pessoa.usuarioId,
      perfil: this.perfil,
      statusValidacao: statusGeral(this.etapas),
      emRevalidacao: false,
      bloqueiaCriacao: false,
      cadastradoEm: inDays(0),
      dados: dadosDe(this.pessoa),
      etapas: this.etapas,
    };
  }

  resumo() {
    return {
      id: this.pessoa.usuarioId,
      perfil: this.perfil,
      nome: this.pessoa.nome,
      email: this.pessoa.email,
      atuacoes: this.perfil === 'PROFISSIONAL' ? ['Enfermeiro(a)'] : null,
      statusValidacao: statusGeral(this.etapas),
      emRevalidacao: false,
      cadastradoEm: inDays(0),
      etapasPendentes: this.etapas.filter((item) => item.status === 'PENDENTE').length,
    };
  }

  private segmento(): string {
    return this.perfil === 'PACIENTE' ? 'pacientes' : 'profissionais';
  }

  ligarAdmin(): void {
    const base = `/admin/validacoes/${this.segmento()}/${this.pessoa.usuarioId}`;
    cy.intercept(route('GET', base), (req) => req.reply(this.detalhe()));
    cy.intercept(route('POST', new RegExp(`^${base}/etapas/(\\w+)/pre-validacao$`)), (req) => {
      const tipo = /etapas\/(\w+)\/pre-validacao/.exec(req.url)?.[1] ?? 'CPF';
      req.reply(PRE_VALIDACOES[tipo] ?? preValidacao());
    });
    cy.intercept(route('POST', new RegExp(`^${base}/etapas/(\\w+)/decisao$`)), (req) => {
      const tipo = /etapas\/(\w+)\/decisao/.exec(req.url)?.[1];
      const corpo = textoDoCorpo(req.body);
      const aprovada = corpo.includes('"APROVADA"');
      const justificativa = /"justificativa":"([^"]*)"/.exec(corpo)?.[1] ?? null;
      const alvo = this.etapas.find((item) => item.tipo === tipo);
      if (alvo) {
        alvo.status = aprovada ? 'APROVADA' : 'REPROVADA';
        alvo.justificativa = justificativa;
        alvo.avaliadoPor = 'Admin QuickCare';
        alvo.avaliadoEm = new Date().toISOString();
      }
      req.reply(this.detalhe());
    });
  }

  ligarPessoa(): void {
    const caminho = this.perfil === 'PACIENTE' ? '/validacao/paciente' : '/validacao/profissional';
    cy.intercept(route('GET', caminho), (req) => req.reply(this.detalhe()));
    cy.intercept(route('POST', new RegExp(`^${caminho}/etapas/(\\w+)/reenvio$`)), (req) => {
      const tipo = /etapas\/(\w+)\/reenvio/.exec(req.url)?.[1];
      const alvo = this.etapas.find((item) => item.tipo === tipo);
      if (alvo) {
        alvo.historico = [{ ...alvo, historico: [] }];
        alvo.status = 'PENDENTE';
        alvo.justificativa = null;
        alvo.avaliadoPor = null;
        alvo.avaliadoEm = null;
        alvo.documento = arquivoDeHoje('coren-legivel.pdf');
      }
      req.reply(this.detalhe());
    });
  }
}

const PRE_VALIDACOES: Record<string, ReturnType<typeof preValidacao>> = {
  CPF: preValidacao(),
  IDENTIDADE: preValidacao({
    tipo: 'IDENTIDADE',
    parecer: 'SEM_API',
    verificacoes: [{ campo: 'RG', provedor: null, parecer: 'SEM_API', motivos: ['Não há API pública para RG: confira o documento enviado.'], observacoes: [] }],
    sugestaoJustificativa: null,
  }),
  REGISTRO_PROFISSIONAL: preValidacao({
    tipo: 'REGISTRO_PROFISSIONAL',
    verificacoes: [{ campo: 'COREN', provedor: 'Cofen', parecer: 'FAVORAVEL', motivos: ['Inscrição ativa no conselho regional de SP.'], observacoes: [] }],
    sugestaoJustificativa: 'Inscrição ativa no conselho regional de SP.',
  }),
  CNPJ: preValidacao({
    tipo: 'CNPJ',
    verificacoes: [{ campo: 'CNPJ', provedor: 'Receita Federal', parecer: 'FAVORAVEL', motivos: ['CNPJ ativo na Receita Federal.'], observacoes: [] }],
    sugestaoJustificativa: 'CNPJ ativo na Receita Federal.',
  }),
};

type Mensagem = ReturnType<typeof mensagemDe>;

export class ChatAoVivo {
  private readonly canais = new Map<string, Mensagem[]>();
  remetente: Pessoa = MARIANA;

  constructor(private readonly profissionais: Pessoa[]) {}

  private chave(canal: Pessoa | null): string {
    return canal ? String(canal.usuarioId) : 'grupo';
  }

  private mensagens(canal: Pessoa | null): Mensagem[] {
    const chave = this.chave(canal);
    if (!this.canais.has(chave)) {
      this.canais.set(chave, []);
    }
    return this.canais.get(chave)!;
  }

  semear(remetente: Pessoa, conteudo: string, canal: Pessoa | null, extra: Record<string, unknown> = {}): Mensagem {
    const nova = mensagemDe(remetente, conteudo, canal, extra);
    this.mensagens(canal).push(nova);
    return nova;
  }

  private ultima(canal: Pessoa | null) {
    const lista = this.mensagens(canal);
    const ultima = lista[lista.length - 1];
    return ultima
      ? { remetenteId: ultima.remetenteId, conteudo: ultima.conteudo, anexoNomeOriginal: ultima.anexoNomeOriginal, anexoTipo: ultima.anexoTipo, dataEnvio: ultima.dataEnvio }
      : null;
  }

  conversasDe(pessoa: Pessoa) {
    const individuais = this.profissionais
      .filter((profissional) => pessoa === MARIANA || profissional === pessoa)
      .map((profissional) => conversaIndividual(profissional, this.ultima(profissional)));
    return [conversaGrupo(this.ultima(null)), ...individuais];
  }

  ligar(): void {
    cy.intercept(route('GET', '/conversas'), (req) => req.reply(this.conversasDe(this.remetente)));
    cy.intercept(route('GET', `/conversas/${SOLICITACAO_ID}/mensagens`), (req) => {
      const id = req.query['profissionalUsuarioId'];
      const canal = id ? this.profissionais.find((profissional) => String(profissional.usuarioId) === String(id)) ?? null : null;
      req.reply(this.mensagens(canal));
    });
    cy.intercept(route('POST', '/mensagens'), (req) => {
      const corpo = textoDoCorpo(req.body);
      const conteudo = /"conteudo":"((?:[^"\\]|\\.)*)"/.exec(corpo)?.[1] ?? '';
      const canalId = /"profissionalUsuarioId":(\d+)/.exec(corpo)?.[1];
      const canal = canalId ? this.profissionais.find((profissional) => String(profissional.usuarioId) === canalId) ?? null : null;
      const anexo = /name="arquivo"; filename="([^"]+)"/.exec(corpo)?.[1];
      const extra = anexo ? { anexoUrl: `https://arquivos.quickcare.dev/${anexo}`, anexoNomeOriginal: anexo, anexoTipo: 'application/pdf' } : {};
      req.reply(this.semear(this.remetente, JSON.parse(`"${conteudo}"`), canal, extra));
    });
  }
}
