import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FLAGS_URL, FeatureFlagService } from './feature-flag.service';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FeatureFlagService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('mostra a pré-validação enquanto a flag não chegou', () => {
    expect(service.displayPreValidation()).toBeTrue();
    httpMock.expectOne(FLAGS_URL).flush({ displayPreValidacao: true });
  });

  it('esconde a pré-validação quando a flag vem desligada', () => {
    httpMock.expectOne(FLAGS_URL).flush({ displayPreValidacao: false });
    expect(service.displayPreValidation()).toBeFalse();
  });

  it('mantém a pré-validação quando a flag vem ligada', () => {
    httpMock.expectOne(FLAGS_URL).flush({ displayPreValidacao: true });
    expect(service.displayPreValidation()).toBeTrue();
  });

  it('mantém a pré-validação quando a flag não vem na resposta', () => {
    httpMock.expectOne(FLAGS_URL).flush({});
    expect(service.displayPreValidation()).toBeTrue();
  });

  it('mantém a pré-validação quando a consulta da flag falha', () => {
    httpMock.expectOne(FLAGS_URL).flush('erro', { status: 500, statusText: 'Server Error' });
    expect(service.displayPreValidation()).toBeTrue();
  });
});
