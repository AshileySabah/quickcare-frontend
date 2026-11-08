import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { AdminReportService } from './admin-report.service';

const RESUMO = {
  id: 500,
  status: 'EM_ANALISE',
  motivo: 'NEGLIGENCIA',
  motivoRotulo: 'Negligência no atendimento',
  denunciante: 'PACIENTE',
  paciente: { usuarioId: 1, nome: 'Helena', email: 'helena@quickcare.dev' },
  profissional: { usuarioId: 2, nome: 'Bruno', email: 'bruno@quickcare.dev' },
  pacienteId: 10,
  profissionalId: 20,
  criadoEm: '2026-11-08T12:00:00Z',
};

describe('AdminReportService', () => {
  let service: AdminReportService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/admin/denuncias`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminReportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lista filtrando pelo status em maiúsculas', () => {
    service.list(['procedente', 'improcedente']).subscribe((reports) => {
      expect(reports[0].reporter).toBe('paciente');
      expect(reports[0].status).toBe('em_analise');
    });

    const request = httpMock.expectOne((req) => req.url === baseUrl);
    expect(request.request.params.getAll('status')).toEqual(['PROCEDENTE', 'IMPROCEDENTE']);
    request.flush([RESUMO]);
  });

  it('procedente envia a consequência; improcedente envia sem consequência', () => {
    service.decide('500', { result: 'procedente', consequence: 'ocorrencia', justification: ' Confirmado. ' }).subscribe();
    const procedente = httpMock.expectOne(`${baseUrl}/500/decisao`);
    expect(procedente.request.body).toEqual({
      resultado: 'PROCEDENTE',
      consequencia: 'OCORRENCIA',
      justificativa: 'Confirmado.',
      tipoBanimento: null,
      diasSuspensao: null,
    });
    procedente.flush({ resumo: RESUMO, descricao: 'x', atendimentos: [], outrasDenunciasContraODenunciado: 0, acoes: [] });

    service.decide('500', { result: 'improcedente', consequence: 'ocorrencia', justification: 'Sem provas.' }).subscribe();
    const improcedente = httpMock.expectOne(`${baseUrl}/500/decisao`);
    expect(improcedente.request.body).toEqual({
      resultado: 'IMPROCEDENTE',
      consequencia: null,
      justificativa: 'Sem provas.',
      tipoBanimento: null,
      diasSuspensao: null,
    });
    improcedente.flush({ resumo: RESUMO, descricao: 'x', atendimentos: [], outrasDenunciasContraODenunciado: 0, acoes: [] });
  });

  it('procedente com banimento envia o tipo e os dias da suspensão', () => {
    service
      .decide('500', {
        result: 'procedente',
        consequence: 'banimento',
        justification: 'Golpe.',
        ban: { type: 'suspensao', days: 30 },
      })
      .subscribe();
    const request = httpMock.expectOne(`${baseUrl}/500/decisao`);
    expect(request.request.body).toEqual({
      resultado: 'PROCEDENTE',
      consequencia: 'BANIMENTO',
      justificativa: 'Golpe.',
      tipoBanimento: 'SUSPENSAO',
      diasSuspensao: 30,
    });
    request.flush({ resumo: RESUMO, descricao: 'x', atendimentos: [], outrasDenunciasContraODenunciado: 0, acoes: [] });
  });
});
