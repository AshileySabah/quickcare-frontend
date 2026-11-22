import { api, apiError, apiSequence } from '../../support/api';
import {
  perfil,
  sessaoAdmin,
  sessaoAmbos,
  sessaoPaciente,
  sessaoProfissional,
} from '../../support/factories';

function login(email = 'ana@quickcare.dev', senha = 'Senha@123') {
  cy.fillField('E-mail', email);
  cy.fillField('Senha', senha);
  cy.button('Entrar').click();
}

describe('Login e sessão', () => {
  it('valida os campos obrigatórios antes de enviar', () => {
    cy.visitGuest('/login');
    cy.button('Entrar').click();
    cy.contains('Campo obrigatório.').should('be.visible');
    cy.fillField('E-mail', 'email-invalido');
    cy.fillField('Senha', '123');
    cy.button('Entrar').click();
    cy.contains('E-mail inválido.').should('be.visible');
    cy.contains('Senha deve ter ao menos 6 caracteres.').should('be.visible');
  });

  it('mostra erro com credenciais inválidas', () => {
    apiError('POST', '/auth/login', 'E-mail ou senha inválidos.', 401);
    cy.visitGuest('/login');
    login('ana@quickcare.dev', 'SenhaErrada1!');
    cy.toast('E-mail ou senha inválidos.').should('be.visible');
    cy.location('pathname').should('eq', '/login');
  });

  it('paciente aprovado entra em Minhas solicitações', () => {
    api('POST', '/auth/login', sessaoPaciente()).as('login');
    cy.visitGuest('/login');
    login();
    cy.wait('@login').its('request.body').should('deep.equal', { email: 'ana@quickcare.dev', senha: 'Senha@123' });
    cy.location('pathname').should('eq', '/patient');
    cy.contains('h1', 'Minhas solicitações').should('be.visible');
  });

  it('paciente pendente entra com aviso de validação e sem criar solicitação', () => {
    api('POST', '/auth/login', sessaoPaciente('PENDENTE'));
    cy.visitGuest('/login');
    login();
    cy.location('pathname').should('eq', '/patient');
    cy.contains('Seu cadastro está em validação').should('be.visible');
    cy.button('Nova solicitação').should('be.disabled');
  });

  it('paciente reprovado vê o aviso de correção do cadastro', () => {
    api('POST', '/auth/login', sessaoPaciente('REPROVADO'));
    cy.visitGuest('/login');
    login();
    cy.contains('Seu cadastro precisa de correções').should('be.visible');
    cy.button('Corrigir cadastro').should('be.visible');
  });

  it('profissional aprovado entra em Solicitações abertas', () => {
    api('POST', '/auth/login', sessaoProfissional());
    cy.visitGuest('/login');
    login('bruno@quickcare.dev');
    cy.location('pathname').should('eq', '/professional');
    cy.contains('h1', 'Solicitações abertas').should('be.visible');
  });

  it('profissional pendente vai para a tela de validação do cadastro', () => {
    api('POST', '/auth/login', sessaoProfissional('PENDENTE'));
    cy.visitGuest('/login');
    login('bruno@quickcare.dev');
    cy.location('pathname').should('eq', '/professional/aguardando-validacao');
    cy.contains('h1', 'Validação do seu cadastro').should('be.visible');
  });

  it('admin entra na validação cadastral', () => {
    api('POST', '/auth/login', sessaoAdmin());
    cy.visitGuest('/login');
    login('admin@quickcare.dev');
    cy.location('pathname').should('eq', '/admin/validacao');
    cy.contains('h1', 'Validação cadastral').should('be.visible');
  });

  it('quem tem os dois perfis entra no último perfil usado', () => {
    api('POST', '/auth/login', sessaoAmbos('PROFISSIONAL'));
    cy.visitGuest('/login');
    login('ambos@quickcare.dev');
    cy.location('pathname').should('eq', '/professional');
    cy.get('[aria-label="Perfil em uso"]').within(() => {
      cy.contains('button', 'Profissional').should('have.attr', 'aria-pressed', 'true');
    });
  });

  it('e-mail não confirmado mostra aviso e reenvia o link', () => {
    apiError('POST', '/auth/login', 'Confirme seu e-mail para entrar. Enviamos um link para ana@quickcare.dev.', 412);
    api('POST', '/auth/confirmacao-email/reenviar', { mensagem: 'Enviamos um novo link para ana@quickcare.dev.' }).as('reenviar');
    cy.visitGuest('/login');
    login();
    cy.contains('Confirme seu e-mail.').should('be.visible');
    cy.button('Reenviar link').click();
    cy.wait('@reenviar');
    cy.toast('Enviamos um novo link').should('be.visible');
  });

  it('reenvio do link em menos de um minuto é recusado', () => {
    apiError('POST', '/auth/login', 'Confirme seu e-mail para entrar.', 412);
    apiError('POST', '/auth/confirmacao-email/reenviar', 'Já enviamos um link há menos de um minuto. Confira seu e-mail ou espere para pedir outro.', 429);
    cy.visitGuest('/login');
    login();
    cy.button('Reenviar link').click();
    cy.toast('Já enviamos um link há menos de um minuto').should('be.visible');
  });

  it('conta encerrada mostra o painel para recuperar a conta', () => {
    apiError('POST', '/auth/login', 'Sua conta foi encerrada e será excluída em 20/12/2026.', 423);
    api('POST', '/auth/conta/recuperar', sessaoPaciente()).as('recuperar');
    cy.visitGuest('/login');
    login();
    cy.contains('Conta encerrada.').should('be.visible');
    cy.button('Recuperar minha conta').click();
    cy.wait('@recuperar');
    cy.toast('Conta recuperada').should('be.visible');
    cy.location('pathname').should('eq', '/patient');
  });

  it('falha ao recuperar a conta mantém a pessoa no login', () => {
    apiError('POST', '/auth/login', 'Sua conta foi encerrada e será excluída em 20/12/2026.', 423);
    apiError('POST', '/auth/conta/recuperar', 'Esta conta não está encerrada.', 409);
    cy.visitGuest('/login');
    login();
    cy.button('Recuperar minha conta').click();
    cy.toast('Esta conta não está encerrada.').should('be.visible');
    cy.location('pathname').should('eq', '/login');
  });

  it('links do login levam ao cadastro e ao esqueci a senha', () => {
    cy.visitGuest('/login');
    cy.contains('a', 'Esqueci minha senha').click();
    cy.location('pathname').should('eq', '/esqueci-senha');
    cy.visitGuest('/login');
    cy.contains('a', 'Cadastre-se').click();
    cy.location('pathname').should('eq', '/cadastro');
  });

  it('logout volta para o login', () => {
    cy.visitAs('/patient', sessaoPaciente());
    cy.get('[aria-label="Abrir menu da conta"]').click();
    cy.contains('[role="menuitem"]', 'Sair').click();
    cy.location('pathname').should('eq', '/login');
    cy.window().its('localStorage').invoke('getItem', 'quickcare.token').should('be.null');
  });

  it('sessão restaurada pelo token abre a área do perfil', () => {
    cy.visitAs('/patient', sessaoPaciente());
    cy.contains('h1', 'Minhas solicitações').should('be.visible');
  });

  it('rota protegida sem sessão volta para o login', () => {
    cy.visitGuest('/patient');
    cy.location('pathname').should('eq', '/login');
  });

  it('rota de outro papel leva a acesso negado', () => {
    cy.visitAs('/admin', sessaoPaciente());
    cy.location('pathname').should('eq', '/acesso-negado');
    cy.contains('h1', 'Acesso negado').should('be.visible');
    cy.button('Voltar para o login').click();
    cy.location('pathname').should('eq', '/login');
  });

  it('rota inexistente redireciona para o login', () => {
    cy.visitGuest('/rota-que-nao-existe');
    cy.location('pathname').should('eq', '/login');
  });

  it('profissional pendente não acessa a área do profissional', () => {
    cy.visitAs('/professional/propostas', sessaoProfissional('PENDENTE'));
    cy.location('pathname').should('eq', '/professional/aguardando-validacao');
  });

  it('paciente pendente não abre o formulário de nova solicitação', () => {
    cy.visitAs('/patient/novo', sessaoPaciente('PENDENTE'));
    cy.location('pathname').should('eq', '/patient');
  });

  it('sessão expirada pede a senha de novo e repete a ação', () => {
    apiSequence('GET', '/solicitacoes', [{ statusCode: 401, body: {} }, { body: [] }]);
    api('POST', '/auth/login', sessaoPaciente()).as('relogin');
    cy.visitAs('/patient', sessaoPaciente());
    cy.dialog('Sua sessão expirou').within(() => {
      cy.fillField('Senha', 'Senha@123');
      cy.button('Sim, entrar').click();
    });
    cy.wait('@relogin');
    cy.contains('Nenhuma solicitação ativa').should('be.visible');
  });

  it('cancelar o pedido de senha da sessão expirada mostra o aviso', () => {
    api('GET', '/solicitacoes', {}, 401);
    cy.visitAs('/patient', sessaoPaciente());
    cy.dialog('Sua sessão expirou').within(() => cy.button('Não, cancelar').click());
    cy.toast('Sessão expirada. Entre novamente para salvar.').should('be.visible');
  });
});

describe('Alternância de perfil', () => {
  it('troca de paciente para profissional sem sair', () => {
    api('PATCH', '/auth/perfil-ativo', sessaoAmbos('PROFISSIONAL')).as('trocar');
    cy.visitAs('/patient', sessaoAmbos('PACIENTE'));
    cy.get('[aria-label="Perfil em uso"]').contains('button', 'Profissional').click();
    cy.wait('@trocar').its('request.body').should('deep.equal', { perfil: 'PROFISSIONAL' });
    cy.location('pathname').should('eq', '/professional');
  });

  it('mostra o contador de notificações do outro perfil', () => {
    api('GET', '/notificacoes/nao-lidas', { paciente: 0, profissional: 4 });
    cy.visitAs('/patient', sessaoAmbos('PACIENTE'));
    cy.get('[aria-label="Perfil em uso"]').contains('button', 'Profissional').should('contain.text', '4');
  });

  it('perfil banido aparece marcado no seletor', () => {
    cy.visitAs('/patient', sessaoAmbos('PACIENTE', { profissional: perfil('PROFISSIONAL', 'APROVADO', true) }));
    cy.get('[aria-label="Perfil em uso"]').contains('button', 'Profissional').should('contain.text', 'banido');
  });

  it('erro ao trocar de perfil mostra o motivo', () => {
    apiError('PATCH', '/auth/perfil-ativo', 'Você não tem um perfil ativo de profissional.', 403);
    cy.visitAs('/patient', sessaoAmbos('PACIENTE'));
    cy.get('[aria-label="Perfil em uso"]').contains('button', 'Profissional').click();
    cy.toast('Você não tem um perfil ativo de profissional.').should('be.visible');
    cy.location('pathname').should('eq', '/patient');
  });

  it('quem tem um perfil só não vê o seletor e pode criar o outro', () => {
    cy.visitAs('/patient', sessaoPaciente());
    cy.get('[aria-label="Perfil em uso"]').should('not.exist');
    cy.get('[aria-label="Abrir menu da conta"]').click();
    cy.contains('[role="menuitem"]', 'Quero atender como profissional').click();
    cy.location('pathname').should('eq', '/criar-perfil/profissional');
  });

  it('profissional pode criar o perfil de paciente pelo menu', () => {
    cy.visitAs('/professional', sessaoProfissional());
    cy.get('[aria-label="Abrir menu da conta"]').click();
    cy.contains('[role="menuitem"]', 'Criar perfil de paciente').click();
    cy.location('pathname').should('eq', '/criar-perfil/paciente');
  });

  it('quem já tem o perfil não abre a criação dele de novo', () => {
    cy.visitAs('/criar-perfil/paciente', sessaoAmbos('PACIENTE'));
    cy.location('pathname').should('eq', '/patient');
  });

  it('admin não cria perfil de paciente', () => {
    cy.visitAs('/criar-perfil/paciente', sessaoAdmin());
    cy.location('pathname').should('eq', '/acesso-negado');
  });
});
