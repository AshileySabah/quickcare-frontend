import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { FileOpenerService } from './file-opener.service';

describe('FileOpenerService', () => {
  let service: FileOpenerService;
  let httpMock: HttpTestingController;
  let tab: { location: { href: string }; close: jasmine.Spy };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(FileOpenerService);
    httpMock = TestBed.inject(HttpTestingController);
    tab = { location: { href: '' }, close: jasmine.createSpy('close') };
    spyOn(window, 'open').and.returnValue(tab as unknown as Window);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:arquivo');
  });

  afterEach(() => httpMock.verify());

  const file = {
    fileName: 'cpf.pdf',
    contentType: 'application/pdf',
    sizeBytes: 1,
    sentAt: null,
    url: null,
    path: '/validacao/paciente/etapas/1/documento',
  };

  it('busca o arquivo pela API e abre em outra guia, sem expor o bucket', () => {
    service.open(file, () => fail('não deveria dar erro'));

    const req = httpMock.expectOne(`${environment.apiUrl}/validacao/paciente/etapas/1/documento`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x'], { type: 'application/pdf' }));

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(tab.location.href).toBe('blob:arquivo');
  });

  it('se a API falhar, fecha a guia e avisa', () => {
    const onError = jasmine.createSpy('onError');
    service.open(file, onError);

    httpMock.expectOne(`${environment.apiUrl}/validacao/paciente/etapas/1/documento`).flush(null, {
      status: 404,
      statusText: 'Not Found',
    });

    expect(tab.close).toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });
});
