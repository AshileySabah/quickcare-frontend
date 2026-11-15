import { expect, test } from '@playwright/test';
import { captureEvidence } from '../src/helpers/evidence';
import { ConsultaPublicaPage } from '../src/pages/consulta-publica.page';
import { HomePage } from '../src/pages/home.page';

const SUITE_SLUG = '01-publico-e-navegacao';

test.describe('01 - Vitrine Pública e Navegação Inicial @smoke', () => {
  test('CT-E2E-01.1: deve renderizar a Home institucional e navegar pelos CTAs principais', async (
    { page },
    testInfo,
  ) => {
    const home = new HomePage(page);

    await test.step('Acessar a página inicial (/) e validar seções institucionais', async () => {
      await home.goto();
      await expect(home.heroTitle).toBeVisible();
      await expect(page.getByRole('heading', { level: 2, name: 'O que é o QuickCare?' })).toBeVisible();
      await expect(page.getByRole('heading', { level: 2, name: 'Segurança em primeiro lugar' })).toBeVisible();
      await expect(home.ctaPatientButton).toBeVisible();
      await expect(home.ctaProfessionalButton).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-01-home-institucional',
        'Página inicial do QuickCare com banner principal e CTAs visíveis',
      );
    });

    await test.step('Acionar CTA "Quero ser atendido" e validar rota /cadastro/paciente', async () => {
      await home.ctaPatientButton.click();
      await expect(page).toHaveURL(/\/cadastro\/paciente$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Cadastro de paciente' })).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-02-cta-cadastro-paciente',
        'Redirecionamento do CTA de paciente para /cadastro/paciente',
      );
    });

    await test.step('Retornar à Home e acionar CTA "Quero atender" para /cadastro/profissional', async () => {
      await page.goto('/');
      await home.ctaProfessionalButton.click();
      await expect(page).toHaveURL(/\/cadastro\/profissional$/);
      await expect(page.getByRole('heading', { level: 1, name: /Cadastro de profissional/i })).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-03-cta-cadastro-profissional',
        'Redirecionamento do CTA de profissional para /cadastro/profissional',
      );
    });
  });

  test('CT-E2E-01.2: deve carregar a Consulta Pública de Profissionais e permitir interagir com os filtros', async (
    { page },
    testInfo,
  ) => {
    const consulta = new ConsultaPublicaPage(page);

    await test.step('Acessar /consulta/profissionais e aguardar carregamento da vitrine pública', async () => {
      await consulta.gotoProfessionals();
      await expect(consulta.heading).toHaveText('Profissionais de saúde');
      await expect(consulta.filtersForm).toBeVisible();

      await expect(
        consulta.listItems.first().or(consulta.emptyState).or(consulta.errorState),
      ).toBeVisible({ timeout: 30_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-01-consulta-profissionais-inicial',
        'Listagem pública de profissionais validados carregada via API',
      );
    });

    await test.step('Aplicar filtros de modalidade (Online) e cidade (São Paulo)', async () => {
      await consulta.modalitySelect.selectOption('online');
      await consulta.cityInput.fill('São Paulo');
      await expect(consulta.cityInput).toHaveValue('São Paulo');
      await expect(consulta.modalitySelect).toHaveValue('online');
      // Aguarda debounce da busca reativa e término do skeleton da API
      await page.waitForTimeout(400);
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-02-consulta-profissionais-filtros-aplicados',
        'Filtros Online e São Paulo aplicados na busca pública de profissionais',
      );
    });

    await test.step('Limpar filtros e confirmar restauração do estado padrão', async () => {
      await consulta.clearFiltersButton.click();
      await expect(consulta.cityInput).toHaveValue('');
      await expect(consulta.modalitySelect).toHaveValue('');
      await page.waitForTimeout(400);
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-03-consulta-profissionais-filtros-limpos',
        'Estado dos filtros restaurado após acionar o botão Limpar filtros',
      );
    });
  });

  test('CT-E2E-01.3: deve carregar a Consulta Pública de Solicitações preservando o sigilo dos pacientes', async (
    { page },
    testInfo,
  ) => {
    const consulta = new ConsultaPublicaPage(page);

    await test.step('Acessar /consulta/solicitacoes e verificar aviso de anonimização LGPD e listagem', async () => {
      await consulta.gotoRequests();
      await expect(consulta.heading).toHaveText('Solicitações abertas');
      await expect(page.getByText(/não mostramos nome, descrição nem endereço/i)).toBeVisible();

      await expect(
        consulta.listItems.first().or(consulta.emptyState).or(consulta.errorState),
      ).toBeVisible({ timeout: 30_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct03-01-consulta-solicitacoes-sigilo',
        'Consulta pública de solicitações abertas exibindo aviso de anonimização e vagas',
      );
    });
  });
});
