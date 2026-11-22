type Plain = Record<string, unknown>;

function isPlain(value: unknown): value is Plain {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function merge<T>(base: T, override?: DeepPartial<T>): T {
  if (!override) {
    return base;
  }
  const result: Plain = { ...(base as Plain) };
  for (const [key, value] of Object.entries(override as Plain)) {
    const current = result[key];
    result[key] = isPlain(current) && isPlain(value) ? merge(current, value) : value;
  }
  return result as T;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object | null | undefined ? DeepPartial<T[K]> | T[K] : T[K];
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function inHours(hours: number): string {
  return new Date(Date.now() + hours * HOUR).toISOString();
}

export function inDays(days: number): string {
  return new Date(Date.now() + days * DAY).toISOString();
}

export function dateOnly(days: number): string {
  const date = new Date(Date.now() + days * DAY);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function localDateTime(days: number, hour: number, minute = 0): string {
  const date = new Date(Date.now() + days * DAY);
  date.setHours(hour, minute, 0, 0);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:${pad(minute)}`;
}

export type TipoPerfil = 'ADMIN' | 'PACIENTE' | 'PROFISSIONAL';
export type StatusValidacao = 'PENDENTE' | 'APROVADO' | 'REPROVADO';

export interface PerfilStatus {
  tipo: TipoPerfil;
  status: 'ATIVO' | 'BANIDO';
  statusValidacao: StatusValidacao | null;
}

export interface Sessao {
  usuarioId: number;
  nome: string;
  email: string;
  avatarUrl: string | null;
  perfis: PerfilStatus[];
  ultimoPerfil: 'PACIENTE' | 'PROFISSIONAL' | null;
}

export const PACIENTE = { usuarioId: 1, nome: 'Ana Paciente', email: 'ana@quickcare.dev' };
export const PROFISSIONAL = { usuarioId: 2, nome: 'Bruno Enfermeiro', email: 'bruno@quickcare.dev' };
export const ADMIN = { usuarioId: 99, nome: 'Admin QuickCare', email: 'admin@quickcare.dev' };

export function perfil(tipo: TipoPerfil, statusValidacao: StatusValidacao | null = 'APROVADO', banido = false): PerfilStatus {
  return { tipo, status: banido ? 'BANIDO' : 'ATIVO', statusValidacao: tipo === 'ADMIN' ? null : statusValidacao };
}

export function sessaoPaciente(statusValidacao: StatusValidacao = 'APROVADO', banido = false): Sessao {
  return {
    ...PACIENTE,
    avatarUrl: null,
    perfis: [perfil('PACIENTE', statusValidacao, banido)],
    ultimoPerfil: 'PACIENTE',
  };
}

export function sessaoProfissional(statusValidacao: StatusValidacao = 'APROVADO', banido = false): Sessao {
  return {
    ...PROFISSIONAL,
    avatarUrl: null,
    perfis: [perfil('PROFISSIONAL', statusValidacao, banido)],
    ultimoPerfil: 'PROFISSIONAL',
  };
}

export function sessaoAmbos(ultimoPerfil: 'PACIENTE' | 'PROFISSIONAL' = 'PACIENTE', overrides: Partial<Record<'paciente' | 'profissional', PerfilStatus>> = {}): Sessao {
  return {
    usuarioId: 3,
    nome: 'Carla Ambos',
    email: 'ambos@quickcare.dev',
    avatarUrl: null,
    perfis: [overrides.paciente ?? perfil('PACIENTE'), overrides.profissional ?? perfil('PROFISSIONAL')],
    ultimoPerfil,
  };
}

export function sessaoAdmin(): Sessao {
  return { ...ADMIN, avatarUrl: null, perfis: [perfil('ADMIN')], ultimoPerfil: null };
}

export const ESPECIALIDADES = [
  { id: 1, nome: 'Clínica geral', categoria: 'MEDICO' },
  { id: 2, nome: 'Pediatria', categoria: 'MEDICO' },
  { id: 3, nome: 'Curativos', categoria: 'ENFERMEIRO' },
  { id: 4, nome: 'Sondagem', categoria: 'ENFERMEIRO' },
  { id: 5, nome: 'Acompanhante de idosos', categoria: 'CUIDADOR' },
  { id: 6, nome: 'Psicologia', categoria: 'OUTRO' },
  { id: 7, nome: 'Nutrição', categoria: 'OUTRO' },
];

export const CATEGORIAS = [
  { valor: 'MEDICO', rotulo: 'Médico(a)', siglaRegistro: 'CRM' },
  { valor: 'ENFERMEIRO', rotulo: 'Enfermeiro(a)', siglaRegistro: 'COREN' },
  { valor: 'CUIDADOR', rotulo: 'Cuidador(a)', siglaRegistro: null },
  { valor: 'OUTRO', rotulo: 'Outros profissionais', siglaRegistro: 'Registro profissional' },
];

export const UFS = [
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'SP', nome: 'São Paulo' },
];

export function especialidade(id: number) {
  const found = ESPECIALIDADES.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Especialidade ${id} não existe na massa.`);
  }
  return { ...found };
}

export function atuacao(override?: DeepPartial<ReturnType<typeof atuacaoBase>>) {
  return merge(atuacaoBase(), override);
}

function atuacaoBase() {
  return {
    id: 10,
    categoria: 'ENFERMEIRO',
    categoriaRotulo: 'Enfermeiro(a)',
    rotulo: 'Enfermeiro(a)',
    siglaRegistro: 'COREN' as string | null,
    especialidades: [especialidade(3), especialidade(4)],
    registroProfissional: '123456' as string | null,
    registroProfissionalUf: 'SP' as string | null,
  };
}

export function atuacaoMedico() {
  return atuacao({
    id: 11,
    categoria: 'MEDICO',
    categoriaRotulo: 'Médico(a)',
    rotulo: 'Médico(a)',
    siglaRegistro: 'CRM',
    especialidades: [especialidade(1)],
    registroProfissional: '654321',
  });
}

export function minhaAtuacao(override: Partial<{ atuacao: ReturnType<typeof atuacao>; statusRegistro: string | null; liberada: boolean }> = {}) {
  return { atuacao: atuacao(), statusRegistro: 'APROVADA' as string | null, liberada: true, ...override };
}

export function profissionalSolicitado(override?: DeepPartial<ReturnType<typeof profissionalSolicitadoBase>>) {
  return merge(profissionalSolicitadoBase(), override);
}

function profissionalSolicitadoBase() {
  return {
    categoria: 'ENFERMEIRO',
    categoriaRotulo: 'Enfermeiro(a)',
    especialidades: [especialidade(3)],
    quantidade: 1,
    vagasPreenchidas: 0,
  };
}

export const ENDERECO = {
  cep: '01310100',
  logradouro: 'Avenida Paulista',
  numero: '1000',
  complemento: null as string | null,
  bairro: 'Bela Vista',
  cidade: 'São Paulo',
  uf: 'SP',
};

export function solicitacao(override?: DeepPartial<ReturnType<typeof solicitacaoBase>>) {
  return merge(solicitacaoBase(), override);
}

function solicitacaoBase() {
  return {
    id: 100,
    pacienteId: PACIENTE.usuarioId,
    profissionais: [profissionalSolicitado()],
    descricao: 'Preciso de curativo diário após cirurgia no joelho, de preferência pela manhã.',
    modalidade: 'ONLINE' as 'ONLINE' | 'PRESENCIAL',
    endereco: null as typeof ENDERECO | null,
    prazoDesejado: dateOnly(10),
    status: 'RECEBENDO_PROPOSTAS',
    criadoEm: inDays(-2),
    atualizadoEm: inDays(-2),
    totalPropostas: 0,
    atendimentoEmAndamento: false,
    proximoAtendimentoInicio: undefined as string | undefined,
    atuacoesParaProposta: [atuacao()],
  };
}

export function problema(override?: DeepPartial<ReturnType<typeof problemaBase>>) {
  return merge(problemaBase(), override);
}

function problemaBase() {
  return {
    id: 700,
    status: 'AGUARDANDO_RESPOSTA',
    relatadoPor: 'PACIENTE',
    motivo: 'OUTRO_NAO_COMPARECEU',
    descricao: 'O profissional não apareceu no horário combinado.',
    criadoEm: inDays(-1),
    prazoResposta: inDays(6),
    contestacao: undefined as string | undefined,
    contestadoEm: undefined as string | undefined,
    decisao: undefined as string | undefined,
    decisaoJustificativa: undefined as string | undefined,
    decididoEm: undefined as string | undefined,
    anexos: [] as { id: number; lado: string; nomeArquivo: string; contentType: string; url?: string }[],
  };
}

export function atendimento(override?: DeepPartial<ReturnType<typeof atendimentoBase>>) {
  return merge(atendimentoBase(), override);
}

function atendimentoBase() {
  return {
    id: 500,
    status: 'AGENDADO',
    inicio: inDays(5),
    termino: inHours(5 * 24 + 2),
    aceitoEm: inDays(-1),
    remarcacao: undefined as { inicio: string; termino: string; solicitadaPor: string; solicitadaEm: string } | undefined,
    canceladoPor: undefined as string | undefined,
    motivoCancelamento: undefined as string | undefined,
    cancelamentoContaOcorrencia: false,
    alteracaoTardia: false,
    podeRelatarProblema: false,
    problema: undefined as ReturnType<typeof problema> | undefined,
  };
}

export function proposta(override?: DeepPartial<ReturnType<typeof propostaBase>>) {
  return merge(propostaBase(), override);
}

function propostaBase() {
  return {
    id: 200,
    solicitacao: {
      id: 100,
      pacienteId: PACIENTE.usuarioId as number | undefined,
      pacienteNome: PACIENTE.nome as string | undefined,
      pacienteAvatarUrl: undefined as string | undefined,
      profissionais: [profissionalSolicitado()],
      modalidade: 'ONLINE',
      prazoDesejado: dateOnly(10),
      status: 'RECEBENDO_PROPOSTAS',
      pacienteIndisponivel: false,
    },
    profissional: {
      id: PROFISSIONAL.usuarioId,
      nome: PROFISSIONAL.nome as string | null,
      avatarUrl: null as string | null,
      atuacaoId: 10,
      categoria: 'ENFERMEIRO',
      categoriaRotulo: 'Enfermeiro(a)',
      atuacaoRotulo: 'Enfermeiro(a)',
      especialidades: [especialidade(3)],
      perfilIndisponivel: false,
    },
    valor: 150,
    abordagem: 'Faço o curativo com material estéril e oriento a família sobre os cuidados.',
    inicio: inDays(5),
    termino: inHours(5 * 24 + 2),
    status: 'PENDENTE',
    motivoReaceite: undefined as string | undefined,
    atendimento: undefined as ReturnType<typeof atendimento> | undefined,
    criadoEm: inDays(-1),
    atualizadoEm: inDays(-1),
  };
}

export function ocorrencia(override?: DeepPartial<ReturnType<typeof ocorrenciaBase>>) {
  return merge(ocorrenciaBase(), override);
}

function ocorrenciaBase() {
  return {
    id: 800,
    motivo: 'CANCELAMENTO_ATENDIMENTO',
    criadoEm: inDays(-3),
    solicitacaoId: 100 as number | undefined,
    atendimentoId: 500 as number | undefined,
    anulada: false,
    anuladaEm: undefined as string | undefined,
    justificativa: undefined as string | undefined,
    criadoPor: undefined as string | undefined,
    justificativaAnulacao: undefined as string | undefined,
    anuladaPor: undefined as string | undefined,
    podeRecorrer: true,
    recurso: undefined as
      | { id: number; status: string; texto: string; criadoEm: string; decididoEm?: string; justificativaDecisao?: string; decididoPor?: string }
      | undefined,
    jaGerouBloqueio: false,
  };
}

export function bloqueio(override?: DeepPartial<ReturnType<typeof bloqueioBase>>) {
  return merge(bloqueioBase(), override);
}

function bloqueioBase() {
  return {
    id: 900,
    nivel: 1,
    inicio: inDays(-1),
    fim: inDays(6),
    ativo: true,
    removidoEm: undefined as string | undefined,
    removidoPor: undefined as string | undefined,
    justificativaRemocao: undefined as string | undefined,
    desfeito: false,
    aplicadoPor: undefined as string | undefined,
    justificativa: undefined as string | undefined,
  };
}

export function resumoOcorrencias(override: Partial<{ contando: number; limite: number; janelaDias: number; bloqueio: ReturnType<typeof bloqueio>; ocorrencias: ReturnType<typeof ocorrencia>[] }> = {}) {
  return { contando: 0, limite: 3, janelaDias: 90, ocorrencias: [] as ReturnType<typeof ocorrencia>[], ...override };
}

export function banimento(override?: DeepPartial<ReturnType<typeof banimentoBase>>) {
  return merge(banimentoBase(), override);
}

function banimentoBase() {
  return {
    id: 950,
    perfil: 'PACIENTE',
    tipo: 'SUSPENSAO',
    inicio: inDays(-1),
    fim: inDays(14) as string | undefined,
    justificativa: 'Comportamento inadequado com profissionais.',
    aplicadoPor: 'Admin QuickCare' as string | undefined,
    denunciaId: undefined as number | undefined,
    ativo: true,
    podeRecorrer: true,
    encerradoEm: undefined as string | undefined,
    encerramento: undefined as string | undefined,
    encerradoPor: undefined as string | undefined,
    justificativaEncerramento: undefined as string | undefined,
    recurso: undefined as
      | { status: string; texto: string; criadoEm: string; decididoEm?: string; decididoPor?: string; justificativa?: string }
      | undefined,
  };
}

export function arquivo(nomeArquivo = 'documento.pdf') {
  return { nomeArquivo, contentType: 'application/pdf', tamanhoBytes: 12000, enviadoEm: inDays(-5), caminho: `/validacao/arquivos/${nomeArquivo}` };
}

export function etapa(override?: DeepPartial<ReturnType<typeof etapaBase>>) {
  return merge(etapaBase(), override);
}

function etapaBase() {
  return {
    id: 1,
    tipo: 'CPF',
    descricao: 'CPF',
    atuacao: null as ReturnType<typeof atuacao> | null,
    status: 'APROVADA',
    justificativa: 'Documento conferido.' as string | null,
    documento: arquivo('cpf.pdf') as ReturnType<typeof arquivo> | null,
    anexo: null as ReturnType<typeof arquivo> | null,
    avaliadoPor: 'Admin QuickCare' as string | null,
    avaliadoEm: inDays(-4) as string | null,
    criadoEm: inDays(-5),
    historico: [] as unknown[],
  };
}

export function dadosCadastrais(perfilValidado: 'PACIENTE' | 'PROFISSIONAL') {
  const pessoa = perfilValidado === 'PACIENTE' ? PACIENTE : PROFISSIONAL;
  return {
    nome: pessoa.nome,
    email: pessoa.email,
    telefone: '11987654321',
    avatarUrl: null,
    cpf: perfilValidado === 'PACIENTE' ? '52998224725' : '40442820135',
    dataNascimento: '1990-05-10',
    genero: 'FEMININO',
    documentoIdentidadeTipo: 'RG',
    documentoIdentidadeNumero: '123456782',
    documentoIdentidadeUf: 'SP',
    ...ENDERECO,
    atuacoes: perfilValidado === 'PROFISSIONAL' ? [atuacao()] : null,
    cnpj: null as string | null,
  };
}

export function etapasPadrao(perfilValidado: 'PACIENTE' | 'PROFISSIONAL', status = 'APROVADA') {
  const etapas = [
    etapa({ id: 1, tipo: 'CPF', descricao: 'CPF', status }),
    etapa({ id: 2, tipo: 'IDENTIDADE', descricao: 'Documento de identidade', status, documento: arquivo('rg.pdf') }),
  ];
  if (perfilValidado === 'PROFISSIONAL') {
    etapas.push(
      etapa({
        id: 3,
        tipo: 'REGISTRO_PROFISSIONAL',
        descricao: 'Registro profissional',
        status,
        atuacao: atuacao(),
        documento: arquivo('coren.pdf'),
      }),
    );
  }
  return etapas;
}

export function validacaoDetalhe(
  perfilValidado: 'PACIENTE' | 'PROFISSIONAL',
  override: Partial<{ id: number; statusValidacao: StatusValidacao; emRevalidacao: boolean; bloqueiaCriacao: boolean; etapas: ReturnType<typeof etapa>[]; dados: ReturnType<typeof dadosCadastrais> }> = {},
) {
  return {
    id: perfilValidado === 'PACIENTE' ? PACIENTE.usuarioId : PROFISSIONAL.usuarioId,
    perfil: perfilValidado,
    statusValidacao: 'APROVADO' as StatusValidacao,
    emRevalidacao: false,
    bloqueiaCriacao: false,
    cadastradoEm: inDays(-30),
    dados: dadosCadastrais(perfilValidado),
    etapas: etapasPadrao(perfilValidado),
    ...override,
  };
}

export const DESTAQUES = [
  { codigo: 'PONTUALIDADE', rotulo: 'Pontualidade', positivo: true },
  { codigo: 'EDUCACAO', rotulo: 'Educação', positivo: true },
  { codigo: 'BOA_COMUNICACAO', rotulo: 'Boa comunicação', positivo: true },
  { codigo: 'ATRASO', rotulo: 'Atraso', positivo: false },
  { codigo: 'COMUNICACAO_DIFICIL', rotulo: 'Comunicação difícil', positivo: false },
];

export function avaliacaoPendente(override: Partial<Record<string, unknown>> = {}) {
  return {
    atendimentoId: 500,
    solicitacaoId: 100,
    servico: 'Enfermeiro(a) · Curativos',
    nomeAvaliado: PROFISSIONAL.nome as string | null,
    inicio: inDays(-2),
    termino: inHours(-46),
    prazo: inDays(28),
    ...override,
  };
}

export function avaliacoesPendentes(pendentes: ReturnType<typeof avaliacaoPendente>[] = []) {
  return { pendentes, destaques: DESTAQUES };
}

export function resumoAvaliacoes(media: number | null = 4.5, total = 8) {
  return {
    media,
    total,
    destaques: total > 0 ? [{ ...DESTAQUES[0], total: 5 }, { ...DESTAQUES[1], total: 3 }] : [],
  };
}

export function perfilPaciente(override: Partial<Record<string, unknown>> = {}) {
  return {
    nome: PACIENTE.nome,
    email: PACIENTE.email,
    telefone: '11987654321',
    avatarUrl: null,
    dataNascimento: '1990-05-10',
    genero: 'FEMININO',
    contatosEmergencia: [{ nome: 'Carlos Contato', telefone: '11912345678' }],
    ...ENDERECO,
    declaracoes: { confirmacaoInformacoesVerdadeiras: true, consentimentoLgpd: true },
    avaliacoes: resumoAvaliacoes(null, 0),
    alergias: 'Dipirona',
    condicoesSaude: null,
    medicamentosEmUso: null,
    ...override,
  };
}

export function perfilProfissional(override: Partial<Record<string, unknown>> = {}) {
  return {
    nome: PROFISSIONAL.nome,
    email: PROFISSIONAL.email,
    telefone: '11987654322',
    avatarUrl: null,
    dataNascimento: '1988-03-15',
    genero: 'MASCULINO',
    contatosEmergencia: [{ nome: 'Daniela Contato', telefone: '11912345679' }],
    ...ENDERECO,
    declaracoes: { confirmacaoInformacoesVerdadeiras: true, consentimentoLgpd: true },
    avaliacoes: resumoAvaliacoes(),
    possuiSeguroResponsabilidadeCivil: false,
    modalidadeAtendimento: 'AMBOS',
    raioAtendimentoKm: 10,
    ...override,
  };
}

export function perfilPublicoProfissional(override: Partial<Record<string, unknown>> = {}) {
  return {
    id: PROFISSIONAL.usuarioId,
    nome: PROFISSIONAL.nome,
    avatarUrl: null,
    atuacoes: [atuacao()],
    modalidadeAtendimento: 'AMBOS',
    cidade: 'São Paulo',
    uf: 'SP',
    membroDesde: inDays(-200),
    atendimentosConcluidos: 12,
    avaliacoes: resumoAvaliacoes(),
    podeDenunciar: true,
    denunciaEmAndamento: false,
    ...override,
  };
}

export function perfilPublicoPaciente(override: Partial<Record<string, unknown>> = {}) {
  return {
    id: PACIENTE.usuarioId,
    nome: PACIENTE.nome,
    avatarUrl: null,
    idade: 36,
    cidade: 'São Paulo',
    uf: 'SP',
    membroDesde: inDays(-100),
    avaliacoes: resumoAvaliacoes(4, 3),
    podeDenunciar: true,
    denunciaEmAndamento: false,
    ...override,
  };
}

export function profissionalPublico(override: Partial<Record<string, unknown>> = {}) {
  return {
    id: PROFISSIONAL.usuarioId,
    nome: PROFISSIONAL.nome,
    avatarUrl: null,
    atuacoes: [atuacao()],
    modalidadeAtendimento: 'AMBOS',
    cidade: 'São Paulo',
    uf: 'SP',
    atendimentosConcluidos: 12,
    avaliacoes: resumoAvaliacoes(),
    ...override,
  };
}

export function solicitacaoPublica(override: Partial<Record<string, unknown>> = {}) {
  return {
    id: 300,
    modalidade: 'PRESENCIAL',
    cidade: 'Campinas',
    uf: 'SP',
    prazoDesejado: dateOnly(7),
    criadoEm: inDays(-1),
    profissionais: [{ categoriaRotulo: 'Enfermeiro(a)', especialidades: ['Curativos'], quantidade: 2, vagasAbertas: 1 }],
    ...override,
  };
}

export function seguranca(perfis: { perfil: 'PACIENTE' | 'PROFISSIONAL'; encerrado?: boolean; encerradoEm?: string; excluiEm?: string }[] = [{ perfil: 'PACIENTE' }], email = PACIENTE.email) {
  return { email, perfis: perfis.map((item) => ({ encerrado: false, ...item })) };
}

export function usuarioBloqueado(override: Partial<Record<string, unknown>> = {}) {
  return { id: 60, perfilId: PROFISSIONAL.usuarioId, nome: PROFISSIONAL.nome, avatarUrl: null, criadoEm: inDays(-3), ...override };
}

export function previaBloqueio(override: Partial<Record<string, unknown>> = {}) {
  return { nome: PROFISSIONAL.nome, propostasPendentes: 0, propostasAceitas: 0, bloqueioTardio: false, ...override };
}

export function notificacao(override: Partial<Record<string, unknown>> = {}) {
  return {
    id: 40,
    perfil: 'PACIENTE',
    tipo: 'PROPOSTA_RECEBIDA',
    titulo: 'Nova proposta',
    mensagem: 'Bruno Enfermeiro enviou uma proposta para sua solicitação.',
    link: '/patient/solicitacoes/100' as string | null,
    lida: false,
    criadoEm: inHours(-1),
    ...override,
  };
}

export function participante(papel: 'PACIENTE' | 'PROFISSIONAL', override: Partial<Record<string, unknown>> = {}) {
  const pessoa = papel === 'PACIENTE' ? PACIENTE : PROFISSIONAL;
  return { usuarioId: pessoa.usuarioId, perfilId: pessoa.usuarioId, nome: pessoa.nome, papel, avatarUrl: null, ativo: true, ...override };
}

export function conversa(override: Partial<Record<string, unknown>> = {}) {
  return {
    solicitacaoId: 100,
    tipo: 'INDIVIDUAL',
    profissionalUsuarioId: PROFISSIONAL.usuarioId as number | null,
    somenteLeitura: false,
    participantes: [participante('PACIENTE'), participante('PROFISSIONAL')],
    ultimaMensagem: { remetenteId: PROFISSIONAL.usuarioId, conteudo: 'Olá, tudo bem?', dataEnvio: inHours(-2) } as unknown,
    mensagemEncontrada: null as unknown,
    ...override,
  };
}

export function mensagem(override: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1000,
    remetenteId: PROFISSIONAL.usuarioId,
    solicitacaoId: 100,
    conteudo: 'Olá, tudo bem?' as string | null,
    dataEnvio: inHours(-2),
    apagada: false,
    anexoUrl: null as string | null,
    anexoNomeOriginal: null as string | null,
    anexoTipo: null as string | null,
    profissionalUsuarioId: PROFISSIONAL.usuarioId as number | null,
    ...override,
  };
}

export function parte(pessoa: { usuarioId: number; nome: string; email: string }) {
  return { usuarioId: pessoa.usuarioId, nome: pessoa.nome, email: pessoa.email };
}

export function acaoAdmin(override: Partial<Record<string, unknown>> = {}) {
  return { tipo: 'OCORRENCIA_LANCADA', admin: ADMIN.nome, detalhe: undefined, justificativa: 'Registro de teste.', criadoEm: inDays(-1), ...override };
}

export function validacaoResumo(override: Partial<Record<string, unknown>> = {}) {
  return {
    id: PROFISSIONAL.usuarioId,
    perfil: 'PROFISSIONAL',
    nome: PROFISSIONAL.nome,
    email: PROFISSIONAL.email,
    atuacoes: ['Enfermeiro(a)'],
    statusValidacao: 'PENDENTE',
    emRevalidacao: false,
    cadastradoEm: inDays(-2),
    etapasPendentes: 3,
    ...override,
  };
}

export function preValidacao(override: Partial<Record<string, unknown>> = {}) {
  return {
    tipo: 'CPF',
    parecer: 'FAVORAVEL',
    verificacoes: [{ campo: 'CPF', provedor: 'Serpro', parecer: 'FAVORAVEL', motivos: ['CPF regular na Receita Federal.'], observacoes: [] }],
    sugestaoJustificativa: 'CPF regular na Receita Federal.',
    consultadoEm: inHours(0),
    ...override,
  };
}

export function disputaResumo(override: Partial<Record<string, unknown>> = {}) {
  return {
    id: 700,
    status: 'EM_DISPUTA',
    atendimentoId: 500,
    solicitacaoId: 100,
    servico: 'Enfermeiro(a) · Curativos',
    inicio: inDays(-3),
    termino: inHours(-70),
    paciente: parte(PACIENTE),
    profissional: parte(PROFISSIONAL),
    relatadoPor: 'PACIENTE',
    motivo: 'OUTRO_NAO_COMPARECEU',
    criadoEm: inDays(-2),
    prazoResposta: inDays(5),
    contestadoEm: inDays(-1) as string | undefined,
    ...override,
  };
}

export function disputaDetalhe(override: Partial<Record<string, unknown>> = {}) {
  return {
    resumo: disputaResumo(),
    statusAtendimento: 'EM_DISPUTA',
    statusAntesDoRelato: 'FINALIZADO',
    problema: problema({ status: 'EM_DISPUTA', contestacao: 'Eu estive lá, o paciente não abriu a porta.', contestadoEm: inDays(-1) }),
    eventos: [{ tipo: 'AGENDADO', autor: 'Sistema', inicio: inDays(-3), termino: inHours(-70), criadoEm: inDays(-4) }],
    acoes: [] as unknown[],
    ...override,
  };
}

export function denunciaResumo(override: Partial<Record<string, unknown>> = {}) {
  return {
    id: 600,
    status: 'EM_ANALISE',
    motivo: 'COMPORTAMENTO_INADEQUADO',
    motivoRotulo: 'Comportamento inadequado',
    denunciante: 'PACIENTE',
    paciente: parte(PACIENTE),
    profissional: parte(PROFISSIONAL),
    pacienteId: PACIENTE.usuarioId,
    profissionalId: PROFISSIONAL.usuarioId,
    criadoEm: inDays(-1),
    ...override,
  };
}

export function denunciaDetalhe(override: Partial<Record<string, unknown>> = {}) {
  return {
    resumo: denunciaResumo(),
    descricao: 'O profissional foi grosseiro durante todo o atendimento.',
    anexo: undefined as unknown,
    consequencia: undefined as string | undefined,
    justificativaDecisao: undefined as string | undefined,
    atendimentos: [{ id: 500, solicitacaoId: 100, servico: 'Enfermeiro(a) · Curativos', status: 'CONCLUIDO', inicio: inDays(-10), termino: inDays(-10) }],
    outrasDenunciasContraODenunciado: 0,
    acoes: [] as unknown[],
    ...override,
  };
}

export function perfilAdminResumo(override: Partial<Record<string, unknown>> = {}) {
  return {
    usuarioId: PACIENTE.usuarioId,
    perfil: 'PACIENTE',
    nome: PACIENTE.nome,
    email: PACIENTE.email,
    statusValidacao: 'APROVADO',
    banido: false,
    ocorrenciasContando: 1,
    recursosEmAnalise: 0,
    bloqueio: undefined as unknown,
    congeladoEm: undefined as string | undefined,
    ...override,
  };
}

export function perfilAdminDetalhe(override: Partial<Record<string, unknown>> = {}) {
  return {
    resumo: perfilAdminResumo(),
    limite: 3,
    janelaDias: 90,
    ocorrencias: [ocorrencia()],
    bloqueios: [] as unknown[],
    motivosDeBloqueio: [] as unknown[],
    banimentos: [] as unknown[],
    acoes: [] as unknown[],
    ...override,
  };
}

export function motivoBloqueio(override: Partial<Record<string, unknown>> = {}) {
  return {
    id: 650,
    status: 'EM_ANALISE',
    texto: 'O profissional foi agressivo na conversa.',
    bloqueado: PROFISSIONAL.nome,
    solicitacaoId: 100,
    servico: 'Enfermeiro(a) · Curativos',
    inicioDoAtendimento: inHours(20),
    aceitoEm: inDays(-5),
    criadoEm: inHours(-1),
    ...override,
  };
}

export function solicitacaoAdminResumo(override: Partial<Record<string, unknown>> = {}) {
  return {
    id: 100,
    status: 'RECEBENDO_PROPOSTAS',
    paciente: parte(PACIENTE),
    servico: 'Enfermeiro(a) · Curativos',
    modalidade: 'ONLINE',
    cidade: undefined,
    uf: undefined,
    prazoDesejado: dateOnly(10),
    vagas: 1,
    vagasPreenchidas: 0,
    criadoEm: inDays(-2),
    ...override,
  };
}

export function solicitacaoAdminDetalhe(override: Partial<Record<string, unknown>> = {}) {
  return {
    resumo: solicitacaoAdminResumo(),
    solicitacao: solicitacao(),
    propostas: [
      { id: 200, profissional: parte(PROFISSIONAL), status: 'PENDENTE', valor: 150, inicio: inDays(5), termino: inHours(122) },
    ] as unknown[],
    acoesPermitidas: ['CONCLUIR', 'CANCELAR'],
    acoes: [] as unknown[],
    ...override,
  };
}

export function propostaAdmin(override: Partial<Record<string, unknown>> = {}) {
  return {
    id: 200,
    status: 'PENDENTE',
    solicitacaoId: 100,
    statusSolicitacao: 'RECEBENDO_PROPOSTAS',
    servico: 'Enfermeiro(a) · Curativos',
    paciente: parte(PACIENTE),
    profissional: parte(PROFISSIONAL),
    valor: 150,
    inicio: inDays(5),
    termino: inHours(122),
    statusAtendimento: undefined as string | undefined,
    acoesPermitidas: ['RECUSAR'],
    criadoEm: inDays(-1),
    ...override,
  };
}

export function bloqueioUsuarioAdmin(override: Partial<Record<string, unknown>> = {}) {
  return {
    id: 70,
    paciente: parte(PACIENTE),
    profissional: parte(PROFISSIONAL),
    bloqueadoPor: 'ADMIN',
    criadoPor: ADMIN.nome,
    justificativa: 'Conflito recorrente entre os dois.',
    criadoEm: inDays(-2),
    ...override,
  };
}
