export interface PerfilStatusApi {
  tipo: 'ADMIN' | 'PACIENTE' | 'PROFISSIONAL';
  status: 'ATIVO' | 'BANIDO';
  statusValidacao: 'PENDENTE' | 'APROVADO' | 'REPROVADO' | null;
}

export interface LoginApiResponse {
  usuarioId: number;
  nome: string;
  email: string;
  avatarUrl: string | null;
  perfis: PerfilStatusApi[];
  ultimoPerfil: 'PACIENTE' | 'PROFISSIONAL' | null;
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
