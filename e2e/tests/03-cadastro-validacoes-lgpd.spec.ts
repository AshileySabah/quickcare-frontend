import { expect, test } from '@playwright/test';
import { captureEvidence } from '../src/helpers/evidence';
import { CadastroPage } from '../src/pages/cadastro.page';

const SUITE_SLUG = '03-cadastro-validacoes-lgpd';

test.describe('03 - Cadastro, Regras de Validação e Consentimento LGPD @smoke', () => {
  test('CT-E2E-03.1: deve exibir a escolha de perfil em /cadastro e direcionar para paciente ou profissional', async (
    { page },
    testInfo,
  ) => {
    const cadastro = new CadastroPage(page);

    await test.step('Acessar /cadastro e validar opções de perfil disponíveis', async () => {
      await cadastro.gotoSelect();
      await expect(cadastro.selectHeading).toBeVisible();
      await expect(cadastro.patientOptionLink).toBeVisible();
      await expect(cadastro.professionalOptionLink).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-01-selecao-perfil-cadastro',
        'Tela inicial de escolha do tipo de conta (Paciente ou Profissional de saúde)',
      );
    });

    await test.step('Selecionar "Sou paciente" e confirmar abertura de /cadastro/paciente', async () => {
      await cadastro.patientOptionLink.click();
      await expect(page).toHaveURL(/\/cadastro\/paciente$/);
      await expect(cadastro.patientHeading).toBeVisible();
    });

    await test.step('Retornar a /cadastro e selecionar "Sou profissional de saúde"', async () => {
      await cadastro.gotoSelect();
      await cadastro.professionalOptionLink.click();
      await expect(page).toHaveURL(/\/cadastro\/profissional$/);
      await expect(cadastro.professionalHeading).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-02-tela-cadastro-profissional',
        'Formulário de cadastro de profissional de saúde carregado a partir de /cadastro',
      );
    });
  });

  test('CT-E2E-03.2: deve bloquear submissão vazia exigindo documentos comprobatórios e aceite expresso da LGPD', async (
    { page },
    testInfo,
  ) => {
    const cadastro = new CadastroPage(page);

    await test.step('Submeter formulário vazio em /cadastro/paciente e validar exigência documental', async () => {
      await cadastro.gotoPatientRegister();
      await cadastro.submitButton.scrollIntoViewIfNeeded();
      await cadastro.submitButton.click();
      await expect(page).toHaveURL(/\/cadastro\/paciente$/);

      const docError = page.getByText('Envie um documento que comprove seu CPF.');
      await expect(docError).toBeVisible();
      await cadastro.documentsCard.scrollIntoViewIfNeeded();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-01-documentos-obrigatorios',
        'Validação bloqueando o cadastro sem envio de documento comprobatório de CPF',
      );
    });

    await test.step('Validar exigência obrigatória das declarações de veracidade e consentimento LGPD', async () => {
      await expect(cadastro.declarationErrors).toHaveCount(2);
      await expect(cadastro.declarationErrors.nth(0)).toHaveText('Esta confirmação é obrigatória.');
      await expect(cadastro.declarationErrors.nth(1)).toHaveText('Esta confirmação é obrigatória.');
      await cadastro.declarationsCard.scrollIntoViewIfNeeded();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-02-declaracoes-lgpd-obrigatorias',
        'Mensagens obrigatórias exigindo confirmação de veracidade e consentimento LGPD',
      );
    });
  });

  test('CT-E2E-03.3: deve aplicar máscara automática de CPF e rejeitar dígitos verificadores inválidos', async (
    { page },
    testInfo,
  ) => {
    const cadastro = new CadastroPage(page);

    await test.step('Informar sequência numérica repetida (11111111111) e verificar máscara e erro', async () => {
      await cadastro.gotoPatientRegister();
      await cadastro.cpfInput.scrollIntoViewIfNeeded();
      await cadastro.cpfInput.fill('11111111111');
      await cadastro.cpfInput.blur();

      await expect(cadastro.cpfInput).toHaveValue('111.111.111-11');
      await expect(cadastro.cpfError).toHaveText('CPF inválido.');

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct03-cpf-mascara-digito-invalido',
        'Máscara 111.111.111-11 aplicada automaticamente e rejeição pelo cálculo de dígitos verificadores',
      );
    });
  });

  test('CT-E2E-03.4: deve validar requisitos de senha forte, confirmação divergente e limite máximo na data de nascimento', async (
    { page },
    testInfo,
  ) => {
    const cadastro = new CadastroPage(page);

    await test.step('Confirmar restrição de data máxima no campo Data de nascimento', async () => {
      await cadastro.gotoPatientRegister();
      const maxAttr = await cadastro.birthDateInput.getAttribute('max');
      expect(maxAttr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    await test.step('Digitar senha fraca e validar alerta e checklist dinâmico de complexidade', async () => {
      await cadastro.passwordCard.scrollIntoViewIfNeeded();
      await cadastro.passwordInput.fill('senhafraca123');
      await cadastro.passwordInput.blur();
      await expect(cadastro.passwordError).toHaveText('A senha não atende aos requisitos mínimos.');

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct04-01-senha-fraca-requisitos',
        'Checklist dinâmico indicando ausência de letra maiúscula e caractere especial na senha',
      );
    });

    await test.step('Informar senha forte válida com confirmação divergente e validar erro de correspondência', async () => {
      await cadastro.passwordInput.fill('SenhaForte@2026');
      await cadastro.confirmPasswordInput.fill('OutraSenha@2026');
      await cadastro.confirmPasswordInput.blur();

      await expect(cadastro.passwordError).toHaveCount(0);
      await expect(cadastro.confirmPasswordError).toHaveText('As senhas não coincidem.');
      await cadastro.passwordCard.scrollIntoViewIfNeeded();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct04-02-confirmacao-senha-divergente',
        'Todos os requisitos de senha forte atendidos e validação acusando divergência na confirmação',
      );
    });
  });
});
