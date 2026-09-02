export {};

// Credenciais de um usuário já cadastrado nos dados mockados
const EMAIL_VALIDO = 'ana.souza@email.com';
const SENHA_VALIDA = 'quickcare123';

const EMAIL_INEXISTENTE = 'usuario.errado@email.com';
const SENHA_INCORRETA = 'senhaErrada123';

const MENSAGEM_CREDENCIAIS_INVALIDAS = 'E-mail ou senha inválidos.';
const MENSAGEM_CAMPO_OBRIGATORIO = 'Campo obrigatório.';

describe('Login', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  function preencherCampos(email: string, senha: string): void {
    if (email) {
      cy.get('input[type="email"]')
        .clear()
        .type(email);
    }

    if (senha) {
      cy.get('input[type="password"]')
        .clear()
        .type(senha);
    }
  }

  /**
   * Dispara o evento "submit" diretamente no formulário, em vez de clicar
   * no botão. Os campos usam o atributo HTML `required`, e o `<form>` não
   * tem `novalidate` — clicar no botão com um campo vazio faz o próprio
   * navegador bloquear o envio (balão de validação nativo) antes do Angular
   * rodar `submit()`. Disparar o "submit" contorna essa validação nativa e
   * exercita a validação/mensagens do próprio Angular.
   */
  function enviarFormulario(): void {
    cy.get('form.auth-page__form').submit();
  }

  it('faz login com sucesso quando usuário e senha estão corretos', () => {
    preencherCampos(EMAIL_VALIDO, SENHA_VALIDA);
    enviarFormulario();

    cy.url().should('include', '/patient');
  });

  const cenariosDeCredenciaisInvalidas = [
    {
      descricao: 'usuário correto e senha errada',
      email: EMAIL_VALIDO,
      senha: SENHA_INCORRETA,
    },
    {
      descricao: 'usuário errado e senha correta',
      email: EMAIL_INEXISTENTE,
      senha: SENHA_VALIDA,
    },
    {
      descricao: 'usuário errado e senha errada',
      email: EMAIL_INEXISTENTE,
      senha: SENHA_INCORRETA,
    },
  ];

  cenariosDeCredenciaisInvalidas.forEach(
    ({ descricao, email, senha }) => {
      it(`exibe mensagem de erro quando ${descricao}`, () => {
        preencherCampos(email, senha);
        enviarFormulario();

        cy.get('.ui-toast--error')
          .should('be.visible')
          .and('contain.text', MENSAGEM_CREDENCIAIS_INVALIDAS);
        cy.url().should('include', '/login');
      });
    }
  );

  const cenariosDeCampoVazio = [
    {
      descricao: 'somente a senha está vazia',
      email: EMAIL_VALIDO,
      senha: '',
      qtdCamposComErro: 1,
    },
    {
      descricao: 'somente o usuário está vazio',
      email: '',
      senha: SENHA_VALIDA,
      qtdCamposComErro: 1,
    },
    {
      descricao: 'usuário e senha estão vazios',
      email: '',
      senha: '',
      qtdCamposComErro: 2,
    },
  ];

  cenariosDeCampoVazio.forEach(
    ({ descricao, email, senha, qtdCamposComErro }) => {
      it(`exibe erro de campo obrigatório quando ${descricao}`, () => {
        preencherCampos(email, senha);
        enviarFormulario();

        cy.get('.ui-input__error')
          .should('have.length', qtdCamposComErro)
          .each(($erro) => {
            cy.wrap($erro)
              .should('contain.text', MENSAGEM_CAMPO_OBRIGATORIO);
          });

        cy.url().should('include', '/login');
      });
    }
  );
});