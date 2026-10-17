export interface PerfilStatusApi {
  tipo: 'ADMIN' | 'PACIENTE' | 'PROFISSIONAL';
  status: 'ATIVO' | 'BANIDO';
  /** Nulo para o admin, que não passa pela validação cadastral. */
  statusValidacao: 'PENDENTE' | 'APROVADO' | 'REPROVADO' | null;
}

export interface LoginApiResponse {
  usuarioId: number;
  nome: string;
  email: string;
  avatarUrl: string | null;
  perfis: PerfilStatusApi[];
  categoria?: string;
  especialidadeIds?: number[];
}

export interface CadastroApiResponse {
  usuarioId: number;
  perfilId: number;
  nome: string;
  email: string;
  tipoPerfil: 'PACIENTE' | 'PROFISSIONAL';
}

export interface MensagemApiResponse {
  mensagem: string;
}

export interface RedefinirSenhaApiResponse {
  mensagem: string;
  usuario: LoginApiResponse;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  message: string;
}
