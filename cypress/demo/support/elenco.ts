import {
  ADMIN,
  Sessao,
  StatusValidacao,
  atendimento,
  atuacao,
  conversa,
  dateOnly,
  especialidade,
  inDays,
  mensagem,
  merge,
  notificacao,
  perfil,
  perfilPublicoPaciente,
  perfilPublicoProfissional,
  profissionalSolicitado,
  proposta,
  resumoAvaliacoes,
  solicitacao,
} from '../../support/factories';

export interface Pessoa {
  usuarioId: number;
  nome: string;
  primeiroNome: string;
  email: string;
}

export const MARIANA: Pessoa = { usuarioId: 11, nome: 'Mariana Souza', primeiroNome: 'Mariana', email: 'mariana.souza@email.com' };
export const RAFAEL: Pessoa = { usuarioId: 12, nome: 'Rafael Lima', primeiroNome: 'Rafael', email: 'rafael.lima@email.com' };
export const CAMILA: Pessoa = { usuarioId: 13, nome: 'Camila Rocha', primeiroNome: 'Camila', email: 'camila.rocha@email.com' };
export const DIEGO: Pessoa = { usuarioId: 14, nome: 'Diego Alves', primeiroNome: 'Diego', email: 'diego.alves@email.com' };

export const ENDERECO_MARIANA = {
  cep: '04538133',
  logradouro: 'Avenida Brigadeiro Faria Lima',
  numero: '3477',
  complemento: 'Apto 52' as string | null,
  bairro: 'Itaim Bibi',
  cidade: 'São Paulo',
  uf: 'SP',
};

export const SOLICITACAO_ID = 100;

export const CNPJ_RAFAEL = '11222333000181';

export const DESCRICAO_SOLICITACAO =
  'Fiz uma cirurgia no joelho e preciso de curativo diário e de alguém para me acompanhar em casa durante a recuperação.';

export function sessaoPacienteDemo(statusValidacao: StatusValidacao = 'APROVADO'): Sessao {
  return {
    usuarioId: MARIANA.usuarioId,
    nome: MARIANA.nome,
    email: MARIANA.email,
    avatarUrl: null,
    perfis: [perfil('PACIENTE', statusValidacao)],
    ultimoPerfil: 'PACIENTE',
  };
}

export function sessaoProfissionalDemo(pessoa: Pessoa, statusValidacao: StatusValidacao = 'APROVADO', banido = false): Sessao {
  return {
    usuarioId: pessoa.usuarioId,
    nome: pessoa.nome,
    email: pessoa.email,
    avatarUrl: null,
    perfis: [perfil('PROFISSIONAL', statusValidacao, banido)],
    ultimoPerfil: 'PROFISSIONAL',
  };
}

export function sessaoAdminDemo(): Sessao {
  return { ...ADMIN, avatarUrl: null, perfis: [perfil('ADMIN')], ultimoPerfil: null };
}

export const ATUACAO_RAFAEL = atuacao({
  id: 21,
  especialidades: [especialidade(3), especialidade(4)],
  registroProfissional: '458213',
  registroProfissionalUf: 'SP',
});

export const ATUACAO_DIEGO = atuacao({
  id: 23,
  especialidades: [especialidade(3)],
  registroProfissional: '391877',
  registroProfissionalUf: 'SP',
});

export const ATUACAO_CAMILA = atuacao({
  id: 22,
  categoria: 'CUIDADOR',
  categoriaRotulo: 'Cuidador(a)',
  rotulo: 'Cuidador(a)',
  siglaRegistro: null,
  especialidades: [especialidade(5)],
  registroProfissional: null,
  registroProfissionalUf: null,
});

const ATUACAO_POR_PESSOA: Record<number, ReturnType<typeof atuacao>> = {
  [RAFAEL.usuarioId]: ATUACAO_RAFAEL,
  [CAMILA.usuarioId]: ATUACAO_CAMILA,
  [DIEGO.usuarioId]: ATUACAO_DIEGO,
};

export function vagas(enfermeiroPreenchida = false, cuidadorPreenchida = false) {
  return [
    profissionalSolicitado({ categoria: 'ENFERMEIRO', categoriaRotulo: 'Enfermeiro(a)', especialidades: [especialidade(3)], quantidade: 1, vagasPreenchidas: enfermeiroPreenchida ? 1 : 0 }),
    profissionalSolicitado({ categoria: 'CUIDADOR', categoriaRotulo: 'Cuidador(a)', especialidades: [especialidade(5)], quantidade: 1, vagasPreenchidas: cuidadorPreenchida ? 1 : 0 }),
  ];
}

export function solicitacaoMariana(override: Parameters<typeof solicitacao>[0] = {}) {
  const daMariana = solicitacao({
    id: SOLICITACAO_ID,
    pacienteId: MARIANA.usuarioId,
    profissionais: vagas(),
    descricao: DESCRICAO_SOLICITACAO,
    modalidade: 'PRESENCIAL',
    endereco: { ...ENDERECO_MARIANA },
    prazoDesejado: dateOnly(3),
    criadoEm: inDays(0),
    atualizadoEm: inDays(0),
  });
  return merge(daMariana, override);
}

export function solicitacaoParaProfissional(pessoa: Pessoa, override: Parameters<typeof solicitacao>[0] = {}) {
  return merge(solicitacaoMariana({ atuacoesParaProposta: [ATUACAO_POR_PESSOA[pessoa.usuarioId]] }), override);
}

export function emDias(dias: number, hora: number, minuto = 0): string {
  const data = new Date(Date.now() + dias * 86_400_000);
  data.setHours(hora, minuto, 0, 0);
  return data.toISOString();
}

export const PERIODO = {
  rafael: { inicio: emDias(3, 9), termino: emDias(3, 11) },
  camila: { inicio: emDias(3, 8), termino: emDias(3, 18) },
  diego: { inicio: emDias(3, 10), termino: emDias(3, 12) },
  rafaelRemarcado: { inicio: emDias(4, 14), termino: emDias(4, 16) },
};

const PROPOSTA_BASE: Record<number, { id: number; valor: number; abordagem: string; periodo: { inicio: string; termino: string } }> = {
  [RAFAEL.usuarioId]: {
    id: 201,
    valor: 180,
    abordagem: 'Faço o curativo com material estéril, avalio a cicatrização a cada visita e oriento sobre os cuidados com o joelho.',
    periodo: PERIODO.rafael,
  },
  [CAMILA.usuarioId]: {
    id: 202,
    valor: 220,
    abordagem: 'Acompanho durante o dia, ajudo na locomoção, nos exercícios indicados e na organização dos remédios.',
    periodo: PERIODO.camila,
  },
  [DIEGO.usuarioId]: {
    id: 203,
    valor: 150,
    abordagem: 'Tenho experiência com curativos pós-operatórios e levo todo o material necessário.',
    periodo: PERIODO.diego,
  },
};

export function idProposta(pessoa: Pessoa): number {
  return PROPOSTA_BASE[pessoa.usuarioId].id;
}

export function propostaDe(pessoa: Pessoa, override: Parameters<typeof proposta>[0] = {}) {
  const base = PROPOSTA_BASE[pessoa.usuarioId];
  const atuacaoDaPessoa = ATUACAO_POR_PESSOA[pessoa.usuarioId];
  const daPessoa = proposta({
    id: base.id,
    solicitacao: {
      id: SOLICITACAO_ID,
      pacienteId: MARIANA.usuarioId,
      pacienteNome: MARIANA.nome,
      profissionais: vagas(),
      modalidade: 'PRESENCIAL',
      prazoDesejado: dateOnly(3),
      status: 'RECEBENDO_PROPOSTAS',
    },
    profissional: {
      id: pessoa.usuarioId,
      nome: pessoa.nome,
      atuacaoId: atuacaoDaPessoa.id,
      categoria: atuacaoDaPessoa.categoria,
      categoriaRotulo: atuacaoDaPessoa.categoriaRotulo,
      atuacaoRotulo: atuacaoDaPessoa.rotulo,
      especialidades: [atuacaoDaPessoa.especialidades[0]],
    },
    valor: base.valor,
    abordagem: base.abordagem,
    inicio: base.periodo.inicio,
    termino: base.periodo.termino,
    criadoEm: inDays(0),
    atualizadoEm: inDays(0),
  });
  return merge(daPessoa, override);
}

export function atendimentoDe(pessoa: Pessoa, override: Parameters<typeof atendimento>[0] = {}) {
  const base = PROPOSTA_BASE[pessoa.usuarioId];
  const daPessoa = atendimento({
    id: base.id + 300,
    inicio: base.periodo.inicio,
    termino: base.periodo.termino,
    aceitoEm: inDays(0),
  });
  return merge(daPessoa, override);
}

export function aceitaDe(pessoa: Pessoa, atendimentoOverride: Parameters<typeof atendimento>[0] = {}) {
  return propostaDe(pessoa, {
    status: 'ACEITA',
    solicitacao: { status: 'EM_ANDAMENTO', profissionais: vagas(true, true) },
    atendimento: atendimentoDe(pessoa, atendimentoOverride),
  });
}

export function perfilProfissionalDe(pessoa: Pessoa, override: Record<string, unknown> = {}) {
  const resumo: Record<number, { concluidos: number; avaliacoes: ReturnType<typeof resumoAvaliacoes> }> = {
    [RAFAEL.usuarioId]: { concluidos: 0, avaliacoes: resumoAvaliacoes(null, 0) },
    [CAMILA.usuarioId]: { concluidos: 14, avaliacoes: resumoAvaliacoes(4.6, 11) },
    [DIEGO.usuarioId]: { concluidos: 9, avaliacoes: { media: 3.4, total: 7, destaques: [{ codigo: 'ATRASO', rotulo: 'Atraso', positivo: false, total: 4 }, { codigo: 'PONTUALIDADE', rotulo: 'Pontualidade', positivo: true, total: 2 }] } },
  };
  return perfilPublicoProfissional({
    id: pessoa.usuarioId,
    nome: pessoa.nome,
    atuacoes: [ATUACAO_POR_PESSOA[pessoa.usuarioId]],
    modalidadeAtendimento: 'PRESENCIAL',
    membroDesde: inDays(pessoa === RAFAEL ? 0 : -240),
    atendimentosConcluidos: resumo[pessoa.usuarioId].concluidos,
    avaliacoes: resumo[pessoa.usuarioId].avaliacoes,
    podeDenunciar: false,
    ...override,
  });
}

export function perfilMarianaParaProfissional(override: Record<string, unknown> = {}) {
  return perfilPublicoPaciente({
    id: MARIANA.usuarioId,
    nome: MARIANA.nome,
    idade: 34,
    membroDesde: inDays(0),
    avaliacoes: resumoAvaliacoes(null, 0),
    podeDenunciar: false,
    ...override,
  });
}

export function participanteDe(pessoa: Pessoa, papel: 'PACIENTE' | 'PROFISSIONAL') {
  return { usuarioId: pessoa.usuarioId, perfilId: pessoa.usuarioId, nome: pessoa.nome, papel, avatarUrl: null, ativo: true };
}

export function conversaGrupo(ultimaMensagem: unknown = null) {
  return conversa({
    solicitacaoId: SOLICITACAO_ID,
    tipo: 'GRUPO',
    profissionalUsuarioId: null,
    participantes: [participanteDe(MARIANA, 'PACIENTE'), participanteDe(RAFAEL, 'PROFISSIONAL'), participanteDe(CAMILA, 'PROFISSIONAL')],
    ultimaMensagem,
  });
}

export function conversaIndividual(pessoa: Pessoa, ultimaMensagem: unknown = null) {
  return conversa({
    solicitacaoId: SOLICITACAO_ID,
    tipo: 'INDIVIDUAL',
    profissionalUsuarioId: pessoa.usuarioId,
    participantes: [participanteDe(MARIANA, 'PACIENTE'), participanteDe(pessoa, 'PROFISSIONAL')],
    ultimaMensagem,
  });
}

let proximaMensagem = 5000;

export function mensagemDe(remetente: Pessoa, conteudo: string, canal: Pessoa | null, extra: Record<string, unknown> = {}) {
  proximaMensagem += 1;
  return mensagem({
    id: proximaMensagem,
    remetenteId: remetente.usuarioId,
    solicitacaoId: SOLICITACAO_ID,
    conteudo,
    dataEnvio: new Date().toISOString(),
    profissionalUsuarioId: canal ? canal.usuarioId : null,
    ...extra,
  });
}

let proximaNotificacao = 900;

export function avisoPara(perfilDestino: 'PACIENTE' | 'PROFISSIONAL', tipo: string, titulo: string, texto: string, link: string | null) {
  proximaNotificacao += 1;
  return notificacao({
    id: proximaNotificacao,
    perfil: perfilDestino,
    tipo,
    titulo,
    mensagem: texto,
    link,
    lida: false,
    criadoEm: new Date().toISOString(),
  });
}
