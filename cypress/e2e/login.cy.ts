const email_valido = 'ana.souza@email.com';
const senha_valida = 'quickcare123';

const email_inexistente = 'usuario.errado@email.com';
const senha_incorreta = 'senhaErrada123';

describe('Login', () => {

  beforeEach(() => {
    cy.visit('https://quickcare-frontend.vercel.app/login');
  });

  // 1 - Deve realizar login - senha correta e email válido
  it('Deve realizar login - senha correta e email válido', () => {
    //arrange
    cy.get('input[type="email"]').type(email_valido);
    cy.get('input[type="password"]').type(senha_valida);
    
    //act
    cy.get('button[type="submit"]').click();

    //assert
    //cy.url().should('include', '/login');
  })

  // 2 - Não deve realizar login - usuário correto e senha errada
  it('Não deve realizar login - usuário correto e senha errada', () => {
    // Arrange
    cy.get('input[type="email"]').type(email_valido);
    cy.get('input[type="password"]').type(senha_incorreta);

    // Act
    cy.get('button[type="submit"]').click();

    // Assert
    //cy.url().should('include', '/login');
  });

  // 3 - Não deve realizar login - usuário errado e senha correta
  it('Não deve realizar login - usuário errado e senha correta', () => {
    // Arrange
    cy.get('input[type="email"]').type(email_inexistente);
    cy.get('input[type="password"]').type(senha_valida);

    // Act
    cy.get('button[type="submit"]').click();

    // Assert
    //cy.url().should('include', '/login');
  });

  // 4 - Não deve realizar login - usuário errado e senha errada
  it('Não deve realizar login - usuário errado e senha errada', () => {
    // Arrange
    cy.get('input[type="email"]').type(email_inexistente);
    cy.get('input[type="password"]').type(senha_incorreta);

    // Act
    cy.get('button[type="submit"]').click();

    // Assert
    
  });

  // 5 - Não deve permitir login - somente com usuário preenchido
  it('Não deve permitir login - somente com usuário preenchido', () => {
    // Arrange
    cy.get('input[type="email"]').type(email_valido);

    // Act
    cy.get('button[type="submit"]').click();

    // Assert
    cy.get('input[type="password"]')
      .should('have.value', '');
  });

  // 6 - Não deve permitir login - somente com senha preenchida
  it('Não deve permitir login - somente com senha preenchida', () => {
    // Arrange
    cy.get('input[type="password"]').type(senha_valida);

    // Act
    cy.get('button[type="submit"]').click();

    // Assert
    cy.get('input[type="email"]')
      .should('have.value', '');
  });

  // 7 - Não deve permitir login - com usuário e senha vazios
  it('Não deve permitir login - com usuário e senha vazios', () => {
    // Arrange
    // Nenhum campo será preenchido

    // Act
    cy.get('button[type="submit"]').click();

    // Assert
    cy.get('input[type="email"]')
      .should('have.value', '');

    cy.get('input[type="password"]')
      .should('have.value', '');
  });
})

/*
export {};

// Credenciais de um usuário já cadastrado nos dados mockados
const email_valido = 'ana.souza@email.com';
const senha_valida = 'quickcare123';

const email_inexistente = 'usuario.errado@email.com';
const senha_incorreta = 'senhaErrada123';

const MENSAGEM_CREDENCIAIS_INVALIDAS = 'E-mail ou senha inválidos.';
const MENSAGEM_CAMPO_OBRIGATORIO = 'Campo obrigatório.';

describe('Login', () => {
  beforeEach(() => {
    cy.visit('https://quickcare-frontend.vercel.app/login');
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
  
/*
  function enviarFormulario(): void {
    cy.get('form.auth-page__form').submit();
  }

  it('faz login com sucesso quando usuário e senha estão corretos', () => {
    preencherCampos(email_valido, senha_valida);
    enviarFormulario();

    //cy.url().should('include', '/patient');
  });

  const cenariosDeCredenciaisInvalidas = [
    {
      descricao: 'usuário correto e senha errada',
      email: email_valido,
      senha: senha_incorreta,
    },
    {
      descricao: 'usuário errado e senha correta',
      email: email_inexistente,
      senha: senha_valida,
    },
    {
      descricao: 'usuário errado e senha errada',
      email: email_inexistente,
      senha: senha_incorreta,
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
        //cy.url().should('include', '/login');
      });
    }
  );

  const cenariosDeCampoVazio = [
    {
      descricao: 'somente a senha está vazia',
      email: email_valido,
      senha: '',
      qtdCamposComErro: 1,
    },
    {
      descricao: 'somente o usuário está vazio',
      email: '',
      senha: senha_valida,
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

*/