import { api, apiError } from '../../support/api';
import { perfilPaciente, perfilProfissional, sessaoAmbos, sessaoPaciente, sessaoProfissional } from '../../support/factories';

const CPF_VALIDO = '52998224725';

function pdf(fileName: string) {
  return { contents: Cypress.Buffer.from('%PDF-1.4 teste'), fileName, mimeType: 'application/pdf' };
}

function enviarDocumentosPessoais() {
  cy.get('.ui-document-uploader__input').selectFile([pdf('cpf.pdf'), pdf('rg.pdf')], { force: true });
  cy.get('.ui-document-uploader__type-select').eq(0).select('COMPROVANTE_CPF');
  cy.get('.ui-document-uploader__type-select').eq(1).select('VALIDACAO_CPF');
}

function preencherConta(email: string) {
  cy.fillField('Nome completo', 'Ana Paciente');
  cy.fillField('E-mail', email);
  cy.fillField('Telefone', '11987654321');
  cy.fillField('CPF', CPF_VALIDO);
  cy.selectField('Documento de identidade', 'RG');
  cy.fillField('Número do documento', '1234567');
  cy.selectField('UF emissora', 'MG');
  cy.field('Data de nascimento').type('1990-05-10');
  cy.selectField('Gênero', 'FEMININO');
}

function preencherEndereco() {
  cy.fillField('CEP', '01310100');
  cy.fillField('Logradouro', 'Avenida Paulista');
  cy.fillField('Bairro', 'Bela Vista');
  cy.fillField('Cidade', 'São Paulo');
  cy.fillField('UF', 'SP');
  cy.fillField('Número', '1000');
}

function preencherSenha() {
  cy.fillField('Senha', 'Senha@123');
  cy.fillField('Confirmar senha', 'Senha@123');
}

function aceitarDeclaracoes() {
  cy.contains('.ui-checkbox', 'Confirmo que as informações fornecidas são verdadeiras').click();
  cy.contains('.ui-checkbox', 'Consinto com o tratamento dos meus dados pessoais').click();
}

describe('Escolha do tipo de cadastro', () => {
  it('leva ao cadastro de paciente e ao de profissional', () => {
    cy.visitGuest('/cadastro');
    cy.contains('h1', 'Como você quer se cadastrar?').should('be.visible');
    cy.contains('a', 'Sou paciente').click();
    cy.location('pathname').should('eq', '/cadastro/paciente');
    cy.visitGuest('/cadastro');
    cy.contains('a', 'Sou profissional de saúde').click();
    cy.location('pathname').should('eq', '/cadastro/profissional');
  });
});

describe('Cadastro de paciente', () => {
  beforeEach(() => {
    cy.visitGuest('/cadastro/paciente');
    cy.contains('h1', 'Cadastro de paciente').should('be.visible');
  });

  it('enviar vazio marca os campos obrigatórios e cobra os documentos', () => {
    cy.button('Criar conta').click();
    cy.contains('Campo obrigatório.').should('be.visible');
    cy.contains('Envie um documento que comprove seu CPF.').should('be.visible');
    cy.contains('Esta confirmação é obrigatória.').should('exist');
    cy.focused().should('match', 'input, select, textarea');
  });

  it('recusa CPF inválido, RG sem UF e CNH inválida', () => {
    cy.fillField('CPF', '11111111111');
    cy.selectField('Documento de identidade', 'RG');
    cy.fillField('Número do documento', '1234567');
    cy.button('Criar conta').click();
    cy.contains('CPF inválido.').should('be.visible');
    cy.field('UF emissora').should('have.attr', 'aria-invalid', 'true');
    cy.selectField('Documento de identidade', 'CNH');
    cy.fillField('Número do documento', '12345678911');
    cy.field('Número do documento').blur();
    cy.contains('Número de CNH inválido.').should('be.visible');
  });

  it('confere o dígito do RG de SP', () => {
    cy.selectField('Documento de identidade', 'RG');
    cy.fillField('Número do documento', '123456780');
    cy.selectField('UF emissora', 'SP');
    cy.button('Criar conta').click();
    cy.contains('Número de RG inválido (o dígito verificador não confere).').should('be.visible');
  });

  it('mostra os requisitos da senha e cobra a confirmação igual', () => {
    cy.fillField('Senha', 'fraca');
    cy.get('.password-fields__requirements').should('be.visible');
    cy.fillField('Confirmar senha', 'outra');
    cy.button('Criar conta').click();
    cy.contains('A senha não atende aos requisitos mínimos.').should('be.visible');
    cy.contains('As senhas não coincidem.').should('be.visible');
  });

  it('cobra o tipo de cada documento enviado', () => {
    cy.get('.ui-document-uploader__input').selectFile([pdf('cpf.pdf')], { force: true });
    cy.button('Criar conta').click();
    cy.contains('Escolha o tipo de cada documento enviado.').should('be.visible');
  });

  it('cobra o documento de identidade quando só o CPF foi enviado', () => {
    cy.get('.ui-document-uploader__input').selectFile([pdf('cpf.pdf')], { force: true });
    cy.get('.ui-document-uploader__type-select').eq(0).select('COMPROVANTE_CPF');
    cy.button('Criar conta').click();
    cy.contains('Envie seu documento de identidade (RG ou CNH).').should('be.visible');
  });

  it('adiciona e remove contato de emergência', () => {
    cy.button('+ Adicionar contato').click();
    cy.get('.emergency-contacts-card__row').should('have.length', 1);
    cy.get('[aria-label="Remover contato"]').click();
    cy.get('.emergency-contacts-card__row').should('have.length', 0);
  });

  it('cria a conta e pede a confirmação do e-mail', () => {
    api('POST', '/usuarios/cadastro/paciente', {
      usuarioId: 1,
      perfilId: 1,
      nome: 'Ana Paciente',
      email: 'ana@quickcare.dev',
      tipoPerfil: 'PACIENTE',
      confirmacaoEmailPendente: true,
    }).as('cadastrar');
    preencherConta('ana@quickcare.dev');
    preencherEndereco();
    enviarDocumentosPessoais();
    preencherSenha();
    aceitarDeclaracoes();
    cy.button('Criar conta').click();
    cy.wait('@cadastrar').its('request.headers').its('content-type').should('include', 'multipart/form-data');
    cy.location('pathname').should('eq', '/cadastro/confirme-seu-email');
    cy.contains('ana@quickcare.dev').should('be.visible');
    cy.contains('O link vale por 12 horas').should('be.visible');
  });

  it('sem confirmação pendente vai direto para o login', () => {
    api('POST', '/usuarios/cadastro/paciente', {
      usuarioId: 1,
      perfilId: 1,
      nome: 'Ana Paciente',
      email: 'ana@quickcare.dev',
      tipoPerfil: 'PACIENTE',
      confirmacaoEmailPendente: false,
    });
    preencherConta('ana@quickcare.dev');
    preencherEndereco();
    enviarDocumentosPessoais();
    preencherSenha();
    aceitarDeclaracoes();
    cy.button('Criar conta').click();
    cy.toast('Perfil de paciente criado!').should('be.visible');
    cy.location('pathname').should('eq', '/login');
  });

  it('mostra o erro do back-end (conta encerrada com o mesmo documento)', () => {
    apiError(
      'POST',
      '/usuarios/cadastro/paciente',
      'Existe uma conta encerrada com estes dados. Até 20/12/2026 você pode recuperá-la pelo login.',
      409,
    );
    preencherConta('ana@quickcare.dev');
    preencherEndereco();
    enviarDocumentosPessoais();
    preencherSenha();
    aceitarDeclaracoes();
    cy.button('Criar conta').click();
    cy.toast('Existe uma conta encerrada com estes dados.').should('be.visible');
    cy.location('pathname').should('eq', '/cadastro/paciente');
  });

  it('e-mail já usado é recusado pelo back-end', () => {
    apiError('POST', '/usuarios/cadastro/paciente', 'E-mail já cadastrado.', 409);
    preencherConta('ana@quickcare.dev');
    preencherEndereco();
    enviarDocumentosPessoais();
    preencherSenha();
    aceitarDeclaracoes();
    cy.button('Criar conta').click();
    cy.toast('E-mail já cadastrado.').should('be.visible');
  });

  it('link para trocar para o cadastro de profissional', () => {
    cy.contains('a', 'Cadastre-se como profissional').click();
    cy.location('pathname').should('eq', '/cadastro/profissional');
  });
});

describe('Cadastro de profissional', () => {
  beforeEach(() => {
    cy.visitGuest('/cadastro/profissional');
    cy.contains('h1', 'Cadastro de profissional').should('be.visible');
  });

  function preencherAtuacaoEnfermeiro() {
    cy.selectField('Categoria profissional', 'ENFERMEIRO');
    cy.multiSelect('Especialidades', ['Curativos']);
    cy.fillField('COREN', '123456');
    cy.selectField('UF do registro', 'SP');
    cy.attachFile('Documento do registro', 'coren.pdf');
  }

  it('enviar vazio cobra categoria, modalidade e documentos', () => {
    cy.button('Criar conta').click();
    cy.contains('Selecione uma categoria profissional.').should('be.visible');
    cy.contains('Envie um documento que comprove seu CPF.').should('be.visible');
  });

  it('categoria com registro pede número, UF e documento do registro', () => {
    cy.selectField('Categoria profissional', 'MEDICO');
    cy.field('CRM').should('be.visible');
    cy.button('Criar conta').click();
    cy.contains('Selecione ao menos uma especialidade.').should('be.visible');
    cy.contains('Informe o número de registro profissional.').should('be.visible');
    cy.contains('Envie o documento do registro desta atuação.').should('be.visible');
  });

  it('cuidador não exige registro profissional', () => {
    cy.selectField('Categoria profissional', 'CUIDADOR');
    cy.contains('label', 'UF do registro').should('not.exist');
    cy.contains('Documento do registro').should('not.exist');
  });

  it('em Outros profissionais escolhe uma especialidade por atuação', () => {
    cy.selectField('Categoria profissional', 'OUTRO');
    cy.field('Especialidade').should('be.visible');
    cy.field('Registro profissional').should('be.visible');
  });

  it('inclui outra atuação e bloqueia categoria repetida', () => {
    cy.selectField('Categoria profissional', 'ENFERMEIRO');
    cy.button('Incluir outra atuação').click();
    cy.get('section[aria-label="Atuação 2"]').within(() => {
      cy.contains('option', 'Enfermeiro(a) (já incluída)').should('be.disabled');
    });
    cy.get('[aria-label="Remover atuação 2"]').click();
    cy.get('section[aria-label="Atuação 2"]').should('not.exist');
  });

  it('CNPJ informado exige o documento do CNPJ', () => {
    cy.fillField('CNPJ', '11222333000181');
    cy.get('.ui-document-uploader__input').selectFile([pdf('cpf.pdf'), pdf('rg.pdf')], { force: true });
    cy.get('.ui-document-uploader__type-select').eq(0).select('COMPROVANTE_CPF');
    cy.get('.ui-document-uploader__type-select').eq(1).select('VALIDACAO_CPF');
    cy.button('Criar conta').click();
    cy.contains('Envie um documento que valide o CNPJ informado.').should('be.visible');
  });

  it('CNPJ inválido é recusado', () => {
    cy.fillField('CNPJ', '11222333000100');
    cy.button('Criar conta').click();
    cy.contains('CNPJ inválido.').should('be.visible');
  });

  it('atendimento presencial pede o raio de atendimento', () => {
    cy.contains('.ui-checkbox', 'Atendo presencialmente').click();
    cy.field('Raio de atendimento (km)').should('be.visible');
  });

  it('cria a conta de profissional e pede a confirmação do e-mail', () => {
    api('POST', '/usuarios/cadastro/profissional', {
      usuarioId: 2,
      perfilId: 2,
      nome: 'Bruno Enfermeiro',
      email: 'bruno@quickcare.dev',
      tipoPerfil: 'PROFISSIONAL',
      confirmacaoEmailPendente: true,
    }).as('cadastrar');
    preencherConta('bruno@quickcare.dev');
    preencherAtuacaoEnfermeiro();
    cy.contains('.ui-checkbox', 'Atendo remotamente').click();
    preencherEndereco();
    enviarDocumentosPessoais();
    preencherSenha();
    aceitarDeclaracoes();
    cy.button('Criar conta').click();
    cy.wait('@cadastrar');
    cy.location('pathname').should('eq', '/cadastro/confirme-seu-email');
  });

  it('CNPJ já cadastrado é recusado pelo back-end', () => {
    apiError('POST', '/usuarios/cadastro/profissional', 'CNPJ já cadastrado para outro profissional.', 409);
    preencherConta('bruno@quickcare.dev');
    preencherAtuacaoEnfermeiro();
    cy.contains('.ui-checkbox', 'Atendo remotamente').click();
    preencherEndereco();
    enviarDocumentosPessoais();
    preencherSenha();
    aceitarDeclaracoes();
    cy.button('Criar conta').click();
    cy.toast('CNPJ já cadastrado para outro profissional.').should('be.visible');
  });
});

describe('Criar o outro perfil já logado', () => {
  it('paciente cria o perfil de profissional com os dados trazidos do perfil de paciente', () => {
    api('GET', '/perfil/paciente', perfilPaciente());
    api('POST', '/perfis/profissional', sessaoAmbos('PROFISSIONAL', {})).as('criar');
    cy.visitAs('/criar-perfil/profissional', sessaoPaciente());
    cy.contains('h1', 'Criar perfil de profissional').should('be.visible');
    cy.contains('label', 'Nome completo').should('not.exist');
    cy.field('CEP').should('have.value', '01310-100');
    cy.selectField('Categoria profissional', 'CUIDADOR');
    cy.multiSelect('Especialidades', ['Acompanhante de idosos']);
    cy.contains('.ui-checkbox', 'Atendo remotamente').click();
    enviarDocumentosPessoais();
    aceitarDeclaracoes();
    cy.button('Criar perfil de profissional').click();
    cy.wait('@criar');
    cy.toast('Perfil de profissional criado!').should('be.visible');
    cy.location('pathname').should('eq', '/professional');
  });

  it('profissional cria o perfil de paciente', () => {
    api('GET', '/perfil/profissional', perfilProfissional());
    api('POST', '/perfis/paciente', sessaoAmbos('PACIENTE')).as('criar');
    cy.visitAs('/criar-perfil/paciente', sessaoProfissional());
    cy.contains('h1', 'Criar perfil de paciente').should('be.visible');
    enviarDocumentosPessoais();
    aceitarDeclaracoes();
    cy.button('Criar perfil de paciente').click();
    cy.wait('@criar');
    cy.toast('Perfil de paciente criado!').should('be.visible');
    cy.location('pathname').should('eq', '/patient');
  });

  it('perfil encerrado há pouco não pode ser criado de novo', () => {
    api('GET', '/perfil/profissional', perfilProfissional());
    apiError('POST', '/perfis/paciente', 'Você encerrou seu perfil de paciente há menos de 30 dias. Recupere-o pela Segurança.', 409);
    cy.visitAs('/criar-perfil/paciente', sessaoProfissional());
    enviarDocumentosPessoais();
    aceitarDeclaracoes();
    cy.button('Criar perfil de paciente').click();
    cy.toast('Você encerrou seu perfil de paciente há menos de 30 dias.').should('be.visible');
  });
});

describe('Confirmação de e-mail', () => {
  it('link válido confirma e entra na conta', () => {
    api('POST', '/auth/confirmacao-email/confirmar', sessaoPaciente()).as('confirmar');
    cy.visitGuest('/confirmar-email?token=abc123');
    cy.wait('@confirmar').its('request.body').should('deep.equal', { token: 'abc123' });
    cy.toast('E-mail confirmado.').should('be.visible');
    cy.location('pathname').should('eq', '/patient');
  });

  it('link já usado mostra que o e-mail já foi confirmado', () => {
    apiError('POST', '/auth/confirmacao-email/confirmar', 'Este e-mail já foi confirmado. Entre com seu e-mail e senha.', 409);
    cy.visitGuest('/confirmar-email?token=usado');
    cy.contains('h1', 'Link inválido ou expirado').should('be.visible');
    cy.contains('Este e-mail já foi confirmado.').should('be.visible');
    cy.button('Ir para o login').click();
    cy.location('pathname').should('eq', '/login');
  });

  it('prazo de 12h vencido avisa que o cadastro será apagado', () => {
    apiError('POST', '/auth/confirmacao-email/confirmar', 'O prazo para confirmar o e-mail acabou e o cadastro será apagado. Faça o cadastro de novo.', 410);
    cy.visitGuest('/confirmar-email?token=vencido');
    cy.contains('O prazo para confirmar o e-mail acabou').should('be.visible');
  });

  it('sem token mostra link inválido', () => {
    cy.visitGuest('/confirmar-email');
    cy.contains('Este link de confirmação é inválido.').should('be.visible');
  });

  it('a tela de confirme seu e-mail mostra o endereço e leva ao login', () => {
    cy.visitGuest('/cadastro/confirme-seu-email?email=ana%40quickcare.dev');
    cy.contains('ana@quickcare.dev').should('be.visible');
    cy.button('Ir para o login').click();
    cy.location('pathname').should('eq', '/login');
  });
});
