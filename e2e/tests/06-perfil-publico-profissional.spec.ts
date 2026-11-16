import { expect, test } from '@playwright/test';
import { backendUnavailableReason, isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { ConsultaPublicaPage } from '../src/pages/consulta-publica.page';

const SUITE_SLUG = '06-perfil-publico-profissional';

test.describe('06 - Perfil Público Detalhado do Profissional @smoke', () => {
  test('CT-E2E-06.1: deve abrir o perfil público de um profissional validado exibindo atuações, credenciais e avaliações', async (
    { page },
    testInfo,
  ) => {
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const consulta = new ConsultaPublicaPage(page);
    let selectedName = '';

    await test.step('Selecionar o primeiro profissional da vitrine /consulta/profissionais', async () => {
      await consulta.gotoProfessionals();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
      await expect(consulta.listLinks.first()).toBeVisible();

      selectedName = ((await consulta.listLinks.first().locator('.public-list__name').textContent()) ?? '').trim();
      expect(selectedName.length).toBeGreaterThan(0);

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-01-selecao-card-vitrine-profissionais',
        `Vitrine pública exibindo o card do profissional "${selectedName}" antes da navegação`,
      );

      await consulta.listLinks.first().click();
      await expect(page).toHaveURL(/\/consulta\/profissionais\/\d+$/);
    });

    await test.step('Validar cabeçalho de identidade, detalhes profissionais e resumo de avaliações', async () => {
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
      await expect(consulta.profileNameHeading).toHaveText(selectedName);
      await expect(consulta.profileSubtitle).toBeVisible();
      await expect(consulta.profileDetailsList).toContainText('Atendimento');
      await expect(consulta.profileDetailsList).toContainText('Localização');
      await expect(consulta.profileDetailsList).toContainText('Membro desde');
      await expect(consulta.profileDetailsList).toContainText('Atendimentos concluídos');
      await expect(consulta.profileRatingsSection).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-02-perfil-publico-detalhado-profissional',
        'Perfil público completo renderizado com atuações, registro, localização e estrelas de avaliação',
      );
    });
  });

  test('CT-E2E-06.2: deve permitir acionar o CTA "Quero ser atendido" e retornar à vitrine pelo link Voltar', async (
    { page },
    testInfo,
  ) => {
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const consulta = new ConsultaPublicaPage(page);

    await test.step('Abrir perfil público de profissional e validar retorno à listagem pelo ui-back-link', async () => {
      await consulta.gotoProfessionals();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
      const href = await consulta.listLinks.first().getAttribute('href');
      expect(href).toMatch(/\/consulta\/profissionais\/\d+/);

      await consulta.listLinks.first().click();
      await expect(consulta.profileNameHeading).toBeVisible();

      await consulta.backLink.click();
      await expect(page).toHaveURL(/\/consulta\/profissionais$/);

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-01-retorno-vitrine-link-voltar',
        'Retorno para /consulta/profissionais após acionar o link Voltar no perfil público',
      );
    });

    await test.step('Reabrir perfil público como visitante e acionar CTA "Quero ser atendido"', async () => {
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
      await consulta.listLinks.first().click();
      await expect(consulta.profileCtaButton).toBeVisible();

      await consulta.profileCtaButton.click();
      await expect(page).toHaveURL(/\/cadastro\/paciente$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Cadastro de paciente' })).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-02-cta-quero-ser-atendido-cadastro',
        'Direcionamento do visitante para /cadastro/paciente a partir do CTA do perfil público',
      );
    });
  });

  test('CT-E2E-06.3: deve tratar ID inexistente de profissional exibindo estado vazio informativo', async (
    { page },
    testInfo,
  ) => {
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const consulta = new ConsultaPublicaPage(page);

    await test.step('Acessar /consulta/profissionais/999999999 e verificar estado not-found amigável', async () => {
      await consulta.gotoProfessionalProfile(999999999);
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      await expect(consulta.emptyState).toBeVisible();
      await expect(page.getByText('Perfil não encontrado')).toBeVisible();
      await expect(page.getByText('Este profissional não está mais disponível.')).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct03-perfil-publico-inexistente-not-found',
        'Estado amigável de Perfil não encontrado exibido ao consultar identificador inexistente',
      );
    });
  });
});
