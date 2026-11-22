import { api, apiError } from '../../support/api';
import { inDays, sessaoAmbos, sessaoPaciente, sessaoProfissional, seguranca } from '../../support/factories';

const cartao = (titulo: string) => cy.contains('h2', titulo).closest('ui-card');

describe('Segurança · acesso', () => {
  it('abre pelo menu da conta', () => {
    cy.visitAs('/patient', sessaoPaciente());
    cy.get('[aria-label="Abrir menu da conta"]').click();
    cy.contains('[role="menuitem"]', 'Segurança').click();
    cy.location('pathname').should('eq', '/patient/seguranca');
    cy.contains('h1', 'Segurança').should('be.visible');
    cartao('E-mail').should('contain', 'ana@quickcare.dev');
  });

  it('erro ao carregar permite tentar de novo', () => {
    api('GET', '/seguranca', { message: 'x' }, 500);
    cy.visitAs('/patient/seguranca', sessaoPaciente());
    cy.button('Tentar novamente').should('be.visible');
  });
});

describe('Segurança · trocar e-mail', () => {
  it('pede o código, confirma e mostra o novo e-mail', () => {
    api('POST', '/seguranca/email/codigo', { mensagem: 'Enviamos um código para nova@quickcare.dev.' }).as('codigo');
    api('PATCH', '/seguranca/email', { ...sessaoPaciente(), email: 'nova@quickcare.dev' }).as('confirmar');
    cy.visitAs('/patient/seguranca', sessaoPaciente());
    cartao('E-mail').within(() => {
      cy.fillField('Novo e-mail', 'nova@quickcare.dev');
      cy.fillField('Senha atual', 'Senha@123');
      cy.button('Enviar código').click();
    });
    cy.wait('@codigo').its('request.body').should('deep.equal', { novoEmail: 'nova@quickcare.dev', senha: 'Senha@123' });
    cartao('E-mail').within(() => {
      cy.contains('Enviamos um código de 6 números para').should('contain', 'nova@quickcare.dev');
      cy.fillField('Código', '123456');
      cy.button('Confirmar novo e-mail').click();
    });
    cy.wait('@confirmar').its('request.body').should('deep.equal', { codigo: '123456' });
    cy.toast('E-mail alterado.').should('be.visible');
    cartao('E-mail').should('contain', 'nova@quickcare.dev');
  });

  it('valida os campos e o formato do código', () => {
    api('POST', '/seguranca/email/codigo', { mensagem: 'Código enviado.' });
    cy.visitAs('/patient/seguranca', sessaoPaciente());
    cartao('E-mail').within(() => {
      cy.button('Enviar código').click();
      cy.contains('Informe o novo e-mail.').should('be.visible');
      cy.contains('Informe sua senha atual.').should('be.visible');
      cy.fillField('Novo e-mail', 'nova@quickcare.dev');
      cy.fillField('Senha atual', 'Senha@123');
      cy.button('Enviar código').click();
      cy.fillField('Código', '12ab');
      cy.button('Confirmar novo e-mail').click();
      cy.contains('O código tem 6 números.').should('be.visible');
    });
  });

  it('trocar o e-mail digitado volta ao primeiro passo', () => {
    api('POST', '/seguranca/email/codigo', { mensagem: 'Código enviado.' });
    cy.visitAs('/patient/seguranca', sessaoPaciente());
    cartao('E-mail').within(() => {
      cy.fillField('Novo e-mail', 'nova@quickcare.dev');
      cy.fillField('Senha atual', 'Senha@123');
      cy.button('Enviar código').click();
      cy.button('Trocar o e-mail digitado').click();
      cy.field('Novo e-mail').should('have.value', '');
    });
  });

  const recusasCodigo = [
    'Este e-mail já está em uso em outra conta.',
    'Este já é o e-mail da sua conta.',
    'Já enviamos um código há menos de um minuto. Confira seu e-mail ou espere para pedir outro.',
  ];
  recusasCodigo.forEach((mensagem) => {
    it(`recusa ao pedir código: ${mensagem}`, () => {
      apiError('POST', '/seguranca/email/codigo', mensagem);
      cy.visitAs('/patient/seguranca', sessaoPaciente());
      cartao('E-mail').within(() => {
        cy.fillField('Novo e-mail', 'nova@quickcare.dev');
        cy.fillField('Senha atual', 'Senha@123');
        cy.button('Enviar código').click();
      });
      cy.toast(mensagem).should('be.visible');
    });
  });

  const recusasConfirmacao = [
    'Código incorreto. Confira o e-mail e tente de novo.',
    'O código expirou. Peça um novo.',
    'Código incorreto muitas vezes. Peça um novo código.',
  ];
  recusasConfirmacao.forEach((mensagem) => {
    it(`recusa ao confirmar: ${mensagem}`, () => {
      api('POST', '/seguranca/email/codigo', { mensagem: 'Código enviado.' });
      apiError('PATCH', '/seguranca/email', mensagem, 400);
      cy.visitAs('/patient/seguranca', sessaoPaciente());
      cartao('E-mail').within(() => {
        cy.fillField('Novo e-mail', 'nova@quickcare.dev');
        cy.fillField('Senha atual', 'Senha@123');
        cy.button('Enviar código').click();
        cy.fillField('Código', '000000');
        cy.button('Confirmar novo e-mail').click();
      });
      cy.toast(mensagem).should('be.visible');
    });
  });
});

describe('Segurança · trocar senha', () => {
  it('troca a senha', () => {
    api('PATCH', '/seguranca/senha', { mensagem: 'Senha alterada. As outras sessões foram encerradas.' }).as('trocar');
    cy.visitAs('/patient/seguranca', sessaoPaciente());
    cartao('Senha').within(() => {
      cy.fillField('Senha atual', 'Senha@123');
      cy.fillField('Nova senha', 'NovaSenha@1');
      cy.fillField('Confirmar nova senha', 'NovaSenha@1');
      cy.button('Salvar nova senha').click();
    });
    cy.wait('@trocar').its('request.body').should('deep.equal', { senhaAtual: 'Senha@123', novaSenha: 'NovaSenha@1' });
    cy.toast('Senha alterada.').should('be.visible');
  });

  it('valida força e confirmação', () => {
    cy.visitAs('/patient/seguranca', sessaoPaciente());
    cartao('Senha').within(() => {
      cy.fillField('Nova senha', 'fraca');
      cy.fillField('Confirmar nova senha', 'outra');
      cy.button('Salvar nova senha').click();
      cy.contains('Informe sua senha atual.').should('be.visible');
      cy.contains('A senha não atende aos requisitos.').should('be.visible');
    });
  });

  it('nova senha igual à atual é recusada', () => {
    apiError('PATCH', '/seguranca/senha', 'A nova senha precisa ser diferente da atual.', 400);
    cy.visitAs('/patient/seguranca', sessaoPaciente());
    cartao('Senha').within(() => {
      cy.fillField('Senha atual', 'Senha@123');
      cy.fillField('Nova senha', 'Senha@123');
      cy.fillField('Confirmar nova senha', 'Senha@123');
      cy.button('Salvar nova senha').click();
    });
    cy.toast('A nova senha precisa ser diferente da atual.').should('be.visible');
  });
});

describe('Segurança · encerrar', () => {
  it('quem tem um perfil só encerra a conta inteira e volta ao login', () => {
    api('POST', '/seguranca/encerramento/codigo', { mensagem: 'Enviamos o código para o seu e-mail.' }).as('codigo');
    api('POST', '/seguranca/encerramento', null).as('encerrar');
    cy.visitAs('/patient/seguranca', sessaoPaciente());
    cartao('Encerrar conta').contains('button', 'Encerrar').click();
    cy.dialog('Encerrar conta').within(() => {
      cy.contains('Você tem um só perfil ativo').should('be.visible');
      cy.contains('Por 30 dias, você pode recuperar a conta').should('be.visible');
      cy.fillField('Senha atual', 'Senha@123');
      cy.button('Sim, enviar o código').click();
    });
    cy.wait('@codigo').its('request.body').should('deep.equal', { alvo: 'CONTA', senha: 'Senha@123' });
    cy.dialog('Encerrar conta').within(() => {
      cy.contains('Digite o código de 6 números').should('be.visible');
      cy.fillField('Código', '654321');
      cy.button('Sim, encerrar a conta').click();
    });
    cy.wait('@encerrar').its('request.body').should('deep.equal', { alvo: 'CONTA', codigo: '654321' });
    cy.toast('Conta encerrada.').should('be.visible');
    cy.location('pathname').should('eq', '/login');
  });

  it('quem tem os dois perfis pode encerrar só um', () => {
    api('GET', '/seguranca', seguranca([{ perfil: 'PACIENTE' }, { perfil: 'PROFISSIONAL' }], 'ambos@quickcare.dev'));
    api('POST', '/seguranca/encerramento/codigo', { mensagem: 'Código enviado.' });
    api('POST', '/seguranca/encerramento', sessaoProfissional()).as('encerrar');
    cy.visitAs('/patient/seguranca', sessaoAmbos('PACIENTE'));
    cartao('Encerrar conta').contains('button', 'Encerrar').click();
    cy.dialog('Encerrar conta').within(() => {
      cy.button('Sim, enviar o código').click();
      cy.contains('Escolha o que você quer encerrar.').should('be.visible');
      cy.selectField('O que você quer encerrar', 'patient');
    });
    cy.dialog('Encerrar perfil').within(() => {
      cy.contains('Por 30 dias, você pode recuperar o perfil aqui na tela de Segurança.').should('be.visible');
      cy.fillField('Senha atual', 'Senha@123');
      cy.button('Sim, enviar o código').click();
      cy.fillField('Código', '111222');
      cy.button('Sim, encerrar o perfil').click();
    });
    cy.wait('@encerrar').its('request.body.alvo').should('eq', 'PACIENTE');
    cy.toast('Perfil de paciente encerrado.').should('be.visible');
    cy.location('pathname').should('eq', '/professional');
  });

  it('código pedido para outra opção é recusado', () => {
    api('POST', '/seguranca/encerramento/codigo', { mensagem: 'Código enviado.' });
    apiError('POST', '/seguranca/encerramento', 'Este código foi pedido para outra opção de encerramento. Peça um novo.', 400);
    cy.visitAs('/patient/seguranca', sessaoPaciente());
    cartao('Encerrar conta').contains('button', 'Encerrar').click();
    cy.dialog('Encerrar conta').within(() => {
      cy.fillField('Senha atual', 'Senha@123');
      cy.button('Sim, enviar o código').click();
      cy.fillField('Código', '654321');
      cy.button('Sim, encerrar a conta').click();
    });
    cy.toast('Este código foi pedido para outra opção de encerramento.').should('be.visible');
  });

  it('senha errada ao pedir o código', () => {
    apiError('POST', '/seguranca/encerramento/codigo', 'Senha incorreta.', 400);
    cy.visitAs('/patient/seguranca', sessaoPaciente());
    cartao('Encerrar conta').contains('button', 'Encerrar').click();
    cy.dialog('Encerrar conta').within(() => {
      cy.fillField('Senha atual', 'errada');
      cy.button('Sim, enviar o código').click();
    });
    cy.toast('Senha incorreta.').should('be.visible');
  });

  it('desistir mantém a conta', () => {
    cy.visitAs('/patient/seguranca', sessaoPaciente());
    cartao('Encerrar conta').contains('button', 'Encerrar').click();
    cy.dialog('Encerrar conta').within(() => cy.button('Não, manter a conta').click());
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('recupera um perfil encerrado', () => {
    api(
      'GET',
      '/seguranca',
      seguranca([{ perfil: 'PACIENTE', encerrado: true, encerradoEm: inDays(-5), excluiEm: inDays(25) }, { perfil: 'PROFISSIONAL' }], 'ambos@quickcare.dev'),
    );
    api('POST', '/seguranca/perfis/recuperar', sessaoAmbos('PACIENTE')).as('recuperar');
    cy.visitAs('/professional/seguranca', sessaoProfissional());
    cartao('Perfis encerrados').within(() => {
      cy.contains('Perfil de paciente, encerrado em').should('be.visible');
      cy.button('Recuperar perfil').click();
    });
    cy.dialog('Recuperar perfil').within(() => {
      cy.contains('O que foi cancelado no encerramento não volta.').should('be.visible');
      cy.button('Sim, recuperar o perfil').click();
    });
    cy.wait('@recuperar').its('request.query').should('deep.equal', { perfil: 'PACIENTE' });
    cy.toast('Perfil de paciente recuperado.').should('be.visible');
  });

  it('erro ao recuperar perfil', () => {
    api('GET', '/seguranca', seguranca([{ perfil: 'PACIENTE', encerrado: true, encerradoEm: inDays(-5), excluiEm: inDays(25) }, { perfil: 'PROFISSIONAL' }]));
    apiError('POST', '/seguranca/perfis/recuperar', 'Não há perfil de paciente encerrado para recuperar.');
    cy.visitAs('/professional/seguranca', sessaoProfissional());
    cy.button('Recuperar perfil').click();
    cy.dialog('Recuperar perfil').within(() => cy.button('Sim, recuperar o perfil').click());
    cy.toast('Não há perfil de paciente encerrado para recuperar.').should('be.visible');
  });
});
