import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { PendingRating, RatingHighlight, RatingInput } from '../../../core/models';
import { RatingDialogComponent } from './rating-dialog.component';

const ITEM: PendingRating = {
  attendanceId: '900',
  requestId: '50',
  service: 'Curativos',
  ratedName: 'Joana',
  start: '2026-11-07T08:00:00Z',
  end: '2026-11-07T18:00:00Z',
  deadline: '2026-12-07T18:00:00Z',
};

const HIGHLIGHTS: RatingHighlight[] = [
  { code: 'PONTUALIDADE', label: 'Pontualidade', positive: true },
  { code: 'CUIDADO', label: 'Cuidado', positive: true },
  { code: 'ATRASO', label: 'Atraso', positive: false },
];

describe('RatingDialogComponent', () => {
  let fixture: ComponentFixture<RatingDialogComponent>;
  let submitted: RatingInput[];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RatingDialogComponent] });
    fixture = TestBed.createComponent(RatingDialogComponent);
    fixture.componentRef.setInput('item', ITEM);
    fixture.componentRef.setInput('highlights', HIGHLIGHTS);
    submitted = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));
    fixture.detectChanges();
  });

  const element = () => fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    Array.from(element().querySelectorAll('button')).find((candidate) => candidate.textContent!.trim().startsWith(text))!;
  const star = (value: number) =>
    element().querySelector<HTMLButtonElement>(`.rating-dialog__stars button[aria-label^="${value} estrela"]`)!;

  it('pergunta pelo atendimento e por quem atendeu', () => {
    expect(element().textContent).toContain('Como foi o atendimento de Curativos com Joana?');
    expect(button('Sim, enviar a avaliação')).toBeTruthy();
    expect(button('Não, avaliar depois')).toBeTruthy();
  });

  it('sem estrela não envia, marca o campo e foca a primeira estrela', fakeAsync(() => {
    button('Sim, enviar a avaliação').click();
    fixture.detectChanges();
    flushMicrotasks();

    expect(submitted).toEqual([]);
    expect(element().textContent).toContain('Escolha de 1 a 5 estrelas.');
    expect(element().querySelector('.ui-star-rating--invalid')).not.toBeNull();
    expect(document.activeElement).toBe(star(1));
  }));

  it('envia a nota com os destaques positivos e negativos escolhidos', () => {
    star(4).click();
    button('Pontualidade').click();
    button('Atraso').click();
    fixture.detectChanges();

    button('Sim, enviar a avaliação').click();

    expect(submitted).toEqual([{ score: 4, highlights: ['PONTUALIDADE', 'ATRASO'] }]);
  });

  it('desmarcar um destaque tira ele do envio', () => {
    star(5).click();
    button('Cuidado').click();
    fixture.detectChanges();
    button('Cuidado').click();
    fixture.detectChanges();

    button('Sim, enviar a avaliação').click();

    expect(submitted).toEqual([{ score: 5, highlights: [] }]);
  });
});
