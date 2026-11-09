import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportInput } from '../../../core/models';
import { ReportDialogComponent } from './report-dialog.component';

describe('ReportDialogComponent', () => {
  let fixture: ComponentFixture<ReportDialogComponent>;
  let submitted: ReportInput[];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ReportDialogComponent] });
    fixture = TestBed.createComponent(ReportDialogComponent);
    fixture.componentRef.setInput('target', { kind: 'professional', id: '20', name: 'Bruno' });
    submitted = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));
    fixture.detectChanges();
  });

  const element = () => fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    Array.from(element().querySelectorAll('button')).find((candidate) => candidate.textContent!.trim().startsWith(text))!;

  it('pergunta com os botões em par', () => {
    expect(element().textContent).toContain('Denunciar Bruno?');
    expect(button('Sim, enviar a denúncia')).toBeTruthy();
    expect(button('Não, voltar')).toBeTruthy();
  });

  it('sem motivo e descrição não envia e marca os campos', async () => {
    button('Sim, enviar a denúncia').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(submitted).toEqual([]);
    expect(element().textContent).toContain('Escolha o motivo da denúncia.');
    expect(element().textContent).toContain('Conte o que aconteceu.');
  });

  it('envia o motivo e a descrição preenchidos', () => {
    const select = element().querySelector('select') as HTMLSelectElement;
    select.value = 'negligencia';
    select.dispatchEvent(new Event('change'));
    const textarea = element().querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Não fez o curativo combinado e foi embora antes.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    button('Sim, enviar a denúncia').click();

    expect(submitted).toEqual([
      { reason: 'negligencia', description: 'Não fez o curativo combinado e foi embora antes.', attachment: undefined },
    ]);
  });
});
