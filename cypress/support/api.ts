import { RouteMatcher, StaticResponse } from 'cypress/types/net-stubbing';
import {
  CATEGORIAS,
  ESPECIALIDADES,
  Sessao,
  UFS,
  avaliacoesPendentes,
  perfilPaciente,
  perfilProfissional,
  resumoOcorrencias,
  seguranca,
  validacaoDetalhe,
} from './factories';

export const API_HOST = 'localhost';
export const API_PORT = 8080;
export const TOKEN_KEY = 'quickcare.token';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const API_ORIGIN = `http://${API_HOST}:${API_PORT}`;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function route(method: Method, pathname: string | RegExp): RouteMatcher {
  const path = typeof pathname === 'string' ? escapeRegExp(pathname) : pathname.source.replace(/^\^/, '').replace(/\$$/, '');
  return { method, url: new RegExp(`^${escapeRegExp(API_ORIGIN)}${path}(\\?.*)?$`) };
}

export function api(method: Method, pathname: string | RegExp, body: unknown = {}, statusCode = 200) {
  return cy.intercept(route(method, pathname), { statusCode, body } as StaticResponse);
}

export function apiError(method: Method, pathname: string | RegExp, message: string, statusCode = 409) {
  return cy.intercept(route(method, pathname), {
    statusCode,
    body: { timestamp: new Date().toISOString(), status: statusCode, message },
  });
}

export function apiSequence(method: Method, pathname: string | RegExp, responses: { statusCode?: number; body: unknown }[]) {
  let call = 0;
  return cy.intercept(route(method, pathname), (req) => {
    const response = responses[Math.min(call, responses.length - 1)];
    call += 1;
    req.reply({ statusCode: response.statusCode ?? 200, body: response.body });
  });
}

export function flags(valores: { displayPreValidacao?: boolean } = {}, statusCode = 200) {
  return cy.intercept({ method: 'GET', pathname: '/api/flags' }, { statusCode, body: { displayPreValidacao: true, ...valores } });
}

export function stubDefaults(): void {
  cy.intercept({ url: new RegExp(`^${escapeRegExp(API_ORIGIN)}/`) }, (req) => {
    req.reply({ statusCode: 404, body: { status: 404, message: `Sem mock para ${req.method} ${req.url}` } });
  });
  cy.intercept({ hostname: 'viacep.com.br' }, { statusCode: 200, body: { erro: true } });
  flags();

  api('GET', '/notificacoes', []);
  api('GET', '/notificacoes/nao-lidas', { paciente: 0, profissional: 0 });
  api('PATCH', '/notificacoes/lidas', { paciente: 0, profissional: 0 });
  api('GET', '/conversas', []);
  api('GET', '/conversas/nao-lidas', { total: 0, canais: [] });
  api('POST', /^\/conversas\/\d+\/lida$/, { total: 0, canais: [] });
  api('GET', /^\/conversas\/\d+\/mensagens$/, []);
  api('GET', '/ocorrencias', resumoOcorrencias());
  api('GET', '/banimentos', { banimento: null });
  api('GET', '/validacao/paciente', validacaoDetalhe('PACIENTE'));
  api('GET', '/validacao/profissional', validacaoDetalhe('PROFISSIONAL'));
  api('GET', '/avaliacoes/pendentes', avaliacoesPendentes());
  api('GET', '/especialidades', ESPECIALIDADES);
  api('GET', '/especialidades/categorias', CATEGORIAS);
  api('GET', '/ufs', UFS);
  api('GET', '/solicitacoes', []);
  api('GET', '/solicitacoes/disponiveis', []);
  api('GET', '/propostas', []);
  api('GET', '/perfil/paciente', perfilPaciente());
  api('GET', '/perfil/profissional', perfilProfissional());
  api('GET', '/perfil/profissional/atuacoes', []);
  api('GET', '/seguranca', seguranca());
  api('GET', '/bloqueios', []);
  api('GET', '/publico/profissionais', []);
  api('GET', '/publico/solicitacoes', []);
  api('GET', '/admin/disputas/em-aberto', { total: 0 });
  api('GET', '/admin/denuncias/em-aberto', { total: 0 });
  api('GET', '/admin/recursos/em-aberto', { total: 0 });
  api('GET', '/admin/validacoes/pacientes', []);
  api('GET', '/admin/validacoes/profissionais', []);
  api('GET', '/admin/disputas', []);
  api('GET', '/admin/denuncias', []);
  api('GET', '/admin/perfis', []);
  api('GET', '/admin/solicitacoes', []);
  api('GET', '/admin/propostas', []);
  api('GET', '/admin/bloqueios-usuario', []);
}

export function session(sessao: Sessao): void {
  api('GET', '/auth/me', sessao);
}
