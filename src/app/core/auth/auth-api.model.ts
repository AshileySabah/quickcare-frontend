export interface PerfilStatusApi {
  tipo: 'PACIENTE' | 'PROFISSIONAL';
  status: 'ATIVO' | 'BANIDO';
}

export interface LoginApiResponse {
  usuarioId: number;
  nome: string;
  email: string;
  perfis: PerfilStatusApi[];
}

export interface CadastroApiResponse {
  usuarioId: number;
  perfilId: number;
  nome: string;
  email: string;
  tipoPerfil: 'PACIENTE' | 'PROFISSIONAL';
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  message: string;
}
