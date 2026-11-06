import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { StoredFile } from '../../../../core/models';
import { ToastService } from '../../feedback/toast/toast.service';
import { FileReplacerComponent } from './file-replacer.component';

const CURRENT: StoredFile = {
  fileName: 'rg-antigo.pdf',
  contentType: 'application/pdf',
  sizeBytes: 100,
  sentAt: null,
  url: null,
  path: '/validacao/paciente/etapas/1/documento',
};

describe('FileReplacerComponent', () => {
  function render(current: StoredFile | null) {
    TestBed.configureTestingModule({
      imports: [FileReplacerComponent],
      providers: [provideHttpClient(), { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['error']) }],
    });
    const fixture = TestBed.createComponent(FileReplacerComponent);
    fixture.componentRef.setInput('label', 'Documento');
    fixture.componentRef.setInput('current', current);
    fixture.detectChanges();
    return fixture;
  }

  it('mostra o documento atual com um x; o x troca pelo seletor e diz o que será substituído', () => {
    const fixture = render(CURRENT);
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('rg-antigo.pdf');
    expect(element.querySelector('input[type="file"]')).toBeNull();

    (element.querySelector('button[aria-label="Substituir rg-antigo.pdf"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Substituindo rg-antigo.pdf');
    expect(element.querySelector('input[type="file"]')).not.toBeNull();
  });

  it('"Manter o atual" volta para o documento atual sem arquivo novo', () => {
    const fixture = render(CURRENT);
    const changes: (File | null)[] = [];
    fixture.componentInstance.fileChange.subscribe((file) => changes.push(file));
    const element: HTMLElement = fixture.nativeElement;

    (element.querySelector('button[aria-label="Substituir rg-antigo.pdf"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    (element.querySelector('.ui-file-replacer__undo') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.querySelector('input[type="file"]')).toBeNull();
    expect(changes).toEqual([null]);
  });

  it('sem documento atual, mostra direto o seletor', () => {
    const element: HTMLElement = render(null).nativeElement;

    expect(element.querySelector('input[type="file"]')).not.toBeNull();
  });
});
