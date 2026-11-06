import { TestBed } from '@angular/core/testing';
import { DocumentUploaderComponent } from './document-uploader.component';

describe('DocumentUploaderComponent', () => {
  function render() {
    TestBed.configureTestingModule({ imports: [DocumentUploaderComponent] });
    const fixture = TestBed.createComponent(DocumentUploaderComponent);
    fixture.componentRef.setInput('typeOptions', [
      { value: 'COMPROVANTE_CPF', label: 'CPF' },
      { value: 'VALIDACAO_CPF', label: 'Documento de identidade' },
      { value: 'OUTRO', label: 'Outro' },
    ]);
    fixture.detectChanges();
    return fixture;
  }

  function addFiles(fixture: ReturnType<typeof render>, names: string[]): void {
    const input = (fixture.nativeElement as HTMLElement).querySelector('input[type="file"]') as HTMLInputElement;
    const transfer = new DataTransfer();
    names.forEach((name) => transfer.items.add(new File(['x'], name, { type: 'application/pdf' })));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function metRequirements(fixture: ReturnType<typeof render>): number {
    return (fixture.nativeElement as HTMLElement).querySelectorAll('.ui-document-uploader__checklist-item--met').length;
  }

  it('arquivo novo entra sem tipo e não marca nada como entregue', () => {
    const fixture = render();
    const emitted: { type: string }[][] = [];
    fixture.componentInstance.documentsChange.subscribe((documents) => emitted.push(documents));

    addFiles(fixture, ['a.pdf', 'b.pdf']);

    expect(emitted.at(-1)?.map((document) => document.type)).toEqual(['', '']);
    expect(metRequirements(fixture)).toBe(0);
  });

  it('só fica verde depois de escolher o tipo', () => {
    const fixture = render();
    addFiles(fixture, ['cpf.pdf']);

    const select = (fixture.nativeElement as HTMLElement).querySelector('select') as HTMLSelectElement;
    select.value = 'COMPROVANTE_CPF';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(metRequirements(fixture)).toBe(1);
  });
});
