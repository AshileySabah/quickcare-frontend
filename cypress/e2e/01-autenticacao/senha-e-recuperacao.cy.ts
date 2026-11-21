import { api, apiError, apiSequence } from '../../support/api';
import { sessaoPaciente } from '../../support/factories';

describe('Esqueci a senha', () => {
  beforeEach(() => cy.visitGuest('/esqueci-senha'));

  it('valida o e-mail antes de enviar', () => {
    cy.button('Enviar link').click();
    cy.contains('Campo obrigatório.').should('be.visible');
    cy.fillField('E-mail', 'nao-e-email');
    cy.button('Enviar link').click();
    cy.contains('E-mail inválido.').should('be.visible');
  });

  it('envia o link e bloqueia o reenvio por 60 segundos', () => {
    api('POST', '/auth/senha/esqueci', { mensagem: 'Se o e-mail estiver cadastrado, enviamos um link.' }).as('esqueci');
    cy.fillField('E-mail', 'ana@quickcare.dev');
    cy.button('Enviar link').click();
    cy.wait('@esqueci').its('request.body').should('deep.equal', { email: 'ana@quickcare.dev' });
    cy.contains('h1', 'Verifique seu e-mail').should('be.visible');
    cy.contains('Se o e-mail estiver cadastrado, enviamos um link.').should('be.visible');
    cy.button(/Reenviar em \d+s/).should('be.disabled');
  });

  it('reenvia o link quando o tempo acaba', () => {
    cy.clock();
    api('POST', '/auth/senha/esqueci', { mensagem: 'Enviamos um link.' }).as('esqueci');
    cy.fillField('E-mail', 'ana@quickcare.dev');
    cy.button('Enviar link').click();
    cy.wait('@esqueci');
    cy.tick(61000);
    cy.button('Reenviar link').should('not.be.disabled').click();
    cy.wait('@esqueci');
  });

  it('usar outro e-mail volta ao formulário', () => {
    api('POST', '/auth/senha/esqueci', { mensagem: 'Enviamos um link.' });
    cy.fillField('E-mail', 'ana@quickcare.dev');
    cy.button('Enviar link').click();
    cy.contains('a', 'Usar outro e-mail').click();
    cy.contains('h1', 'Recuperar senha').should('be.visible');
  });

  it('pedido em menos de um minuto é recusado', () => {
    apiError('POST', '/auth/senha/esqueci', 'Aguarde um minuto antes de pedir outro link.', 429);
    cy.fillField('E-mail', 'ana@quickcare.dev');
    cy.button('Enviar link').click();
    cy.toast('Aguarde um minuto antes de pedir outro link.').should('be.visible');
  });
});

describe('Redefinir senha', () => {
  it('sem token mostra link inválido', () => {
    cy.visitGuest('/redefinir-senha');
    cy.contains('h1', 'Link inválido ou expirado').should('be.visible');
    cy.button('Pedir novo link').click();
    cy.location('pathname').should('eq', '/esqueci-senha');
  });

  it('token vencido mostra link inválido', () => {
    apiError('POST', '/auth/senha/validar-token', 'Este link expirou. Peça um novo.', 410);
    cy.visitGuest('/redefinir-senha?token=vencido');
    cy.contains('Este link expirou. Peça um novo.').should('be.visible');
  });

  it('falha de rede permite tentar de novo', () => {
    apiSequence('POST', '/auth/senha/validar-token', [
      { statusCode: 500, body: { message: 'Serviço indisponível.' } },
      { body: {} },
    ]);
    cy.visitGuest('/redefinir-senha?token=abc');
    cy.contains('h1', 'Não foi possível verificar o link').should('be.visible');
    cy.button('Tentar novamente').click();
    cy.field('Nova senha').should('be.visible');
  });

  it('valida a força e a confirmação da nova senha', () => {
    api('POST', '/auth/senha/validar-token', {});
    cy.visitGuest('/redefinir-senha?token=abc');
    cy.fillField('Nova senha', 'fraca');
    cy.fillField('Confirmar nova senha', 'diferente');
    cy.button('Salvar nova senha').click();
    cy.contains('A senha não atende aos requisitos.').should('be.visible');
    cy.contains('As senhas não conferem.').should('be.visible');
  });

  it('salva a nova senha e entra na conta', () => {
    api('POST', '/auth/senha/validar-token', {});
    api('POST', '/auth/senha/redefinir', { mensagem: 'Senha redefinida com sucesso.', usuario: sessaoPaciente() }).as('redefinir');
    cy.visitGuest('/redefinir-senha?token=abc');
    cy.fillField('Nova senha', 'NovaSenha@1');
    cy.fillField('Confirmar nova senha', 'NovaSenha@1');
    cy.button('Salvar nova senha').click();
    cy.wait('@redefinir').its('request.body').should('deep.equal', { token: 'abc', novaSenha: 'NovaSenha@1' });
    cy.toast('Senha redefinida com sucesso.').should('be.visible');
    cy.location('pathname').should('eq', '/patient');
  });

  it('link que vence durante o preenchimento volta para link inválido', () => {
    api('POST', '/auth/senha/validar-token', {});
    apiError('POST', '/auth/senha/redefinir', 'Este link não vale mais.', 410);
    cy.visitGuest('/redefinir-senha?token=abc');
    cy.fillField('Nova senha', 'NovaSenha@1');
    cy.fillField('Confirmar nova senha', 'NovaSenha@1');
    cy.button('Salvar nova senha').click();
    cy.contains('h1', 'Link inválido ou expirado').should('be.visible');
  });
});

describe('Recuperar conta pelo link do e-mail', () => {
  it('recupera e entra na conta', () => {
    api('POST', '/auth/conta/recuperar-por-link', sessaoPaciente()).as('recuperar');
    cy.visitGuest('/recuperar-conta?token=xyz');
    cy.wait('@recuperar');
    cy.toast('Conta recuperada').should('be.visible');
    cy.location('pathname').should('eq', '/patient');
  });

  it('link inválido orienta a recuperar pelo login', () => {
    apiError('POST', '/auth/conta/recuperar-por-link', 'Este link de recuperação não vale mais.', 410);
    cy.visitGuest('/recuperar-conta?token=velho');
    cy.contains('h1', 'Não foi possível recuperar pelo link').should('be.visible');
    cy.contains('Este link de recuperação não vale mais.').should('be.visible');
  });

  it('sem token mostra link inválido', () => {
    cy.visitGuest('/recuperar-conta');
    cy.contains('Este link de recuperação é inválido.').should('be.visible');
  });
});

describe('Desfazer troca de e-mail ("Não fui eu")', () => {
  it('pede a senha anterior e leva para criar uma senha nova', () => {
    api('POST', '/auth/email/desfazer/validar', {});
    api('POST', '/auth/email/desfazer', { tokenRedefinicao: 'reset-1' }).as('desfazer');
    api('POST', '/auth/senha/validar-token', {});
    cy.visitGuest('/desfazer-troca-de-email?token=undo');
    cy.fillField('Senha anterior', 'SenhaAntiga@1');
    cy.button('Desfazer a troca').click();
    cy.wait('@desfazer').its('request.body').should('deep.equal', { token: 'undo', senha: 'SenhaAntiga@1' });
    cy.toast('Troca desfeita.').should('be.visible');
    cy.location('pathname').should('eq', '/redefinir-senha');
    cy.field('Nova senha').should('be.visible');
  });

  it('senha errada mostra o erro e mantém o formulário', () => {
    api('POST', '/auth/email/desfazer/validar', {});
    apiError('POST', '/auth/email/desfazer', 'Senha incorreta. Use a senha que a conta tinha antes da troca de e-mail.', 400);
    cy.visitGuest('/desfazer-troca-de-email?token=undo');
    cy.fillField('Senha anterior', 'errada');
    cy.button('Desfazer a troca').click();
    cy.toast('Senha incorreta.').should('be.visible');
    cy.field('Senha anterior').should('be.visible');
  });

  it('muitas tentativas invalidam o link', () => {
    api('POST', '/auth/email/desfazer/validar', {});
    apiError('POST', '/auth/email/desfazer', 'Senha incorreta muitas vezes. Este link deixou de valer.', 410);
    cy.visitGuest('/desfazer-troca-de-email?token=undo');
    cy.fillField('Senha anterior', 'errada');
    cy.button('Desfazer a troca').click();
    cy.toast('Senha incorreta muitas vezes.').should('be.visible');
  });

  it('senha vazia é cobrada', () => {
    api('POST', '/auth/email/desfazer/validar', {});
    cy.visitGuest('/desfazer-troca-de-email?token=undo');
    cy.button('Desfazer a troca').click();
    cy.contains('Informe a senha que a conta tinha antes da troca.').should('be.visible');
  });

  it('link vencido mostra link inválido', () => {
    apiError('POST', '/auth/email/desfazer/validar', 'Este link para desfazer a troca de e-mail não vale mais.', 410);
    cy.visitGuest('/desfazer-troca-de-email?token=velho');
    cy.contains('h1', 'Link inválido ou expirado').should('be.visible');
  });
});
