import { expect, Locator, Page } from '@playwright/test';

export interface ProposalFormValues {
  price: string;
  startDateTime: string;
  endDateTime: string;
  approach: string;
}

export interface DiscoveredProfessionalCapability {
  categoryValue: string;
  specialtyLabel: string;
  modality: 'online' | 'presencial';
  address?: {
    cep: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

interface PerfilProfissionalApi {
  modalidadeAtendimento: 'ONLINE' | 'PRESENCIAL' | 'AMBOS';
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
}

interface MinhaAtuacaoApi {
  liberada: boolean;
  atuacao: {
    categoria: string;
    especialidades: { id: number; nome: string }[];
  };
}

export class ProfissionalPage {
  readonly mainHeading: Locator;
  readonly submitProposalButton: Locator;
  readonly chatButton: Locator;

  constructor(private readonly page: Page) {
    this.mainHeading = page.locator('h1').first();
    this.submitProposalButton = page.getByRole('button', { name: 'Enviar proposta' });
    this.chatButton = page.getByRole('button', { name: 'Conversar' });
  }

  async gotoHome(): Promise<void> {
    await this.page.goto('/professional');
  }

  /**
   * Consulta /professional/perfil para descobrir dinamicamente uma atuação aprovada
   * e a modalidade do profissional no ambiente atual (local ou remoto).
   */
  async discoverApprovedCapability(): Promise<DiscoveredProfessionalCapability> {
    const profileRespPromise = this.page.waitForResponse(
      (res) => res.request().method() === 'GET' && res.url().endsWith('/perfil/profissional') && res.ok(),
    );
    const areasRespPromise = this.page.waitForResponse(
      (res) => res.request().method() === 'GET' && res.url().endsWith('/perfil/profissional/atuacoes') && res.ok(),
    );

    await this.page.goto('/professional/perfil');

    const [profileResp, areasResp] = await Promise.all([profileRespPromise, areasRespPromise]);
    const profile = (await profileResp.json()) as PerfilProfissionalApi;
    const areas = (await areasResp.json()) as MinhaAtuacaoApi[];

    const approved = areas.find((item) => item.liberada && item.atuacao.especialidades.length > 0);
    if (!approved) {
      throw new Error('A conta de profissional configurada não possui área de atuação liberada para enviar propostas.');
    }

    const supportsOnline =
      profile.modalidadeAtendimento === 'ONLINE' || profile.modalidadeAtendimento === 'AMBOS';

    return {
      categoryValue: approved.atuacao.categoria,
      specialtyLabel: approved.atuacao.especialidades[0].nome,
      modality: supportsOnline ? 'online' : 'presencial',
      address: {
        cep: profile.cep,
        street: profile.logradouro,
        number: profile.numero,
        neighborhood: profile.bairro,
        city: profile.cidade,
        state: profile.uf,
      },
    };
  }

  async fillProposalForRequest(requestId: string, input: ProposalFormValues): Promise<void> {
    await this.page.goto(`/professional/solicitacoes/${requestId}`);
    await expect(this.page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

    const practiceAreaSelect = this.page.locator('app-proposal-form ui-select[formcontrolname="practiceAreaId"] select');
    if (await practiceAreaSelect.isVisible()) {
      await practiceAreaSelect.selectOption({ index: 1 });
    }

    await this.page.locator('app-proposal-form ui-input[formcontrolname="price"] input').fill(input.price);
    await this.page.locator('app-proposal-form ui-input[formcontrolname="start"] input').fill(input.startDateTime);
    await this.page.locator('app-proposal-form ui-input[formcontrolname="end"] input').fill(input.endDateTime);
    await this.page.locator('app-proposal-form ui-textarea[formcontrolname="approach"] textarea').fill(input.approach);
  }

  async submitFilledProposal(): Promise<void> {
    const proposalResponsePromise = this.page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().includes('/propostas') && res.ok(),
    );

    await this.submitProposalButton.scrollIntoViewIfNeeded();
    await this.submitProposalButton.click();
    await proposalResponsePromise;
    await expect(this.page.getByRole('heading', { level: 2, name: /Sua proposta/i })).toBeVisible({ timeout: 20_000 });
  }
}
