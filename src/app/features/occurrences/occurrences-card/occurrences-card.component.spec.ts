import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { OccurrencesCardComponent } from './occurrences-card.component';

describe('OccurrencesCardComponent', () => {
  function render(response: object) {
    TestBed.configureTestingModule({
      imports: [OccurrencesCardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(OccurrencesCardComponent);
    fixture.componentRef.setInput('role', 'professional');
    fixture.detectChanges();

    const request = TestBed.inject(HttpTestingController).expectOne(
      `${environment.apiUrl}/ocorrencias?perfil=PROFISSIONAL`,
    );
    request.flush(response);
    fixture.detectChanges();
    return { element: fixture.nativeElement as HTMLElement };
  }

  it('sem ocorrências recentes nem bloqueio, não aparece', () => {
    const { element } = render({ contando: 0, limite: 3, janelaDias: 90, ocorrencias: [] });

    expect(element.querySelector('ui-card')).toBeNull();
  });

  it('mostra quantas contam e as recentes, com a anulada riscada', () => {
    const { element } = render({
      contando: 1,
      limite: 3,
      janelaDias: 90,
      ocorrencias: [
        { id: 2, motivo: 'CANCELAMENTO_ATENDIMENTO', criadoEm: new Date().toISOString(), anulada: false },
        { id: 1, motivo: 'NAO_COMPARECIMENTO', criadoEm: new Date().toISOString(), anulada: true },
      ],
    });

    expect(element.textContent).toContain('1 de 3 contando nos últimos 90 dias');
    expect(element.querySelectorAll('.occurrences-card__item--annulled').length).toBe(1);
  });

  it('recorrer: botão só onde cabe; status só depois de recorrer', () => {
    const { element } = render({
      contando: 2,
      limite: 3,
      janelaDias: 90,
      ocorrencias: [
        { id: 3, motivo: 'CANCELAMENTO_ATENDIMENTO', criadoEm: new Date().toISOString(), anulada: false, podeRecorrer: true },
        {
          id: 2,
          motivo: 'MANUAL',
          criadoEm: new Date().toISOString(),
          anulada: false,
          podeRecorrer: false,
          recurso: { id: 8, status: 'MANTIDA', texto: 'Não fui eu', criadoEm: new Date().toISOString(), justificativaDecisao: 'Sem comprovação.' },
        },
        {
          id: 1,
          motivo: 'ALTERACAO_TARDIA_SOLICITACAO',
          criadoEm: new Date().toISOString(),
          anulada: false,
          podeRecorrer: false,
          recurso: { id: 7, status: 'EM_ANALISE', texto: 'Internação', criadoEm: new Date().toISOString() },
        },
      ],
    });

    const items = Array.from(element.querySelectorAll('.occurrences-card__item')).map((item) => item.textContent!);
    expect(items[0]).toContain('Recorrer');
    expect(items[0]).not.toContain('Recurso');
    expect(items[1]).toContain('Recurso negado');
    expect(items[1]).toContain('Sem comprovação.');
    expect(items[1]).not.toContain('Recorrer');
    expect(items[2]).toContain('Recurso em análise');
  });

  it('bloqueado: avisa até quando', () => {
    const { element } = render({
      contando: 0,
      limite: 3,
      janelaDias: 90,
      bloqueio: { id: 9, nivel: 1, inicio: '2026-11-01T12:00:00Z', fim: '2026-11-08T12:00:00Z', ativo: true },
      ocorrencias: [],
    });

    expect(element.textContent).toContain('você não pode enviar propostas até');
  });

  it('bloqueado pelas 3: elas seguem contando (3 de 3) até o bloqueio acabar', () => {
    const now = new Date().toISOString();
    const { element } = render({
      contando: 3,
      limite: 3,
      janelaDias: 90,
      bloqueio: { id: 4, nivel: 1, inicio: now, fim: '2026-11-09T18:25:00Z', ativo: true, desfeito: false },
      ocorrencias: [1, 2, 3].map((id) => ({
        id,
        motivo: 'MANUAL',
        criadoEm: now,
        anulada: false,
        podeRecorrer: true,
        jaGerouBloqueio: false,
      })),
    });

    expect(element.textContent).toContain('3 de 3 contando nos últimos 90 dias');
    expect(element.textContent).toContain('Quando o bloqueio acabar, as ocorrências que o causaram deixam de contar');
    expect(element.textContent).not.toContain('Já gerou bloqueio');
  });

  it('depois do bloqueio: explica por que as marcadas não contam', () => {
    const { element } = render({
      contando: 1,
      limite: 3,
      janelaDias: 90,
      ocorrencias: [
        { id: 4, motivo: 'MANUAL', criadoEm: new Date().toISOString(), anulada: false, podeRecorrer: true, jaGerouBloqueio: false },
        { id: 3, motivo: 'MANUAL', criadoEm: new Date().toISOString(), anulada: false, podeRecorrer: true, jaGerouBloqueio: true },
      ],
    });

    expect(element.textContent).toContain('1 de 3 contando');
    expect(element.textContent).toContain('Já gerou bloqueio');
    expect(element.textContent).toContain('não contam mais');
  });
});
