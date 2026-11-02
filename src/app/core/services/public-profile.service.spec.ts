import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PatientPublicProfile, ProfessionalPublicProfile } from '../models';
import { PublicProfileService } from './public-profile.service';

describe('PublicProfileService', () => {
  let service: PublicProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PublicProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('mapeia o perfil do profissional', () => {
    let profile: ProfessionalPublicProfile | undefined;
    service.getProfessional('20').subscribe((result) => (profile = result));

    httpMock.expectOne(`${environment.apiUrl}/profissionais/20/perfil`).flush({
      id: 20,
      nome: 'Joana',
      avatarUrl: null,
      categoria: 'ENFERMEIRO',
      categoriaRotulo: 'Enfermeiro(a)',
      especialidades: ['Curativos'],
      siglaRegistro: 'COREN',
      registroProfissional: '123456',
      registroProfissionalUf: 'SP',
      modalidadeAtendimento: 'AMBOS',
      cidade: 'São Paulo',
      uf: 'SP',
      membroDesde: '2026-01-10T12:00:00Z',
      atendimentosConcluidos: 4,
    });

    expect(profile?.registrationLabel).toBe('COREN');
    expect(profile?.attendanceModality).toBe('AMBOS');
    expect(profile?.avatarUrl).toBeUndefined();
    expect(profile?.completedServices).toBe(4);
  });

  it('paciente sem saúde nem contatos liberados vem sem esses campos', () => {
    let profile: PatientPublicProfile | undefined;
    service.getPatient('10').subscribe((result) => (profile = result));

    httpMock.expectOne(`${environment.apiUrl}/pacientes/10/perfil`).flush({
      id: 10,
      nome: 'Paciente Teste',
      avatarUrl: null,
      idade: 40,
      cidade: 'São Paulo',
      uf: 'SP',
      membroDesde: '2026-01-10T12:00:00Z',
    });

    expect(profile?.age).toBe(40);
    expect(profile?.health).toBeUndefined();
    expect(profile?.emergencyContacts).toBeUndefined();
  });

  it('trata o 404 como perfil indisponível', () => {
    let result: PatientPublicProfile | undefined | 'pendente' = 'pendente';
    service.getPatient('10').subscribe((profile) => (result = profile));

    httpMock
      .expectOne(`${environment.apiUrl}/pacientes/10/perfil`)
      .flush({ message: 'Perfil não encontrado.' }, { status: 404, statusText: 'Not Found' });

    expect(result).toBeUndefined();
  });
});
