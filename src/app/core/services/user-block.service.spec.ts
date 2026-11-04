import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { BlockPreview } from '../models';
import { UserBlockService } from './user-block.service';

const BLOCKED = { id: 9, perfilId: 20, nome: 'Joana', avatarUrl: null, criadoEm: '2026-11-03T10:00:00Z' };

describe('UserBlockService', () => {
  let service: UserBlockService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserBlockService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('mapeia a prévia com o aviso de bloqueio a menos de 48h', () => {
    let preview!: BlockPreview;
    service.preview('professional', '20').subscribe((result) => (preview = result));

    httpMock
      .expectOne(`${environment.apiUrl}/bloqueios/profissionais/20/previa`)
      .flush({ nome: 'Joana', propostasPendentes: 1, propostasAceitas: 1, bloqueioTardio: true });

    expect(preview).toEqual({ name: 'Joana', pendingProposals: 1, acceptedProposals: 1, late: true });
  });

  it('envia o motivo só quando ele foi preenchido', () => {
    service.block('patient', '10', '  O paciente me ameaçou.  ').subscribe();
    const comMotivo = httpMock.expectOne(`${environment.apiUrl}/bloqueios/pacientes/10`);
    expect(comMotivo.request.body).toEqual({ motivo: 'O paciente me ameaçou.' });
    comMotivo.flush(BLOCKED);

    service.block('patient', '10', '   ').subscribe();
    const semMotivo = httpMock.expectOne(`${environment.apiUrl}/bloqueios/pacientes/10`);
    expect(semMotivo.request.body).toEqual({});
    semMotivo.flush(BLOCKED);
  });
});
