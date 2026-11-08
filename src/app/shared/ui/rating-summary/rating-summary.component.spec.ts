import { TestBed } from '@angular/core/testing';
import { RatingSummary } from '../../../core/models';
import { RatingSummaryComponent } from './rating-summary.component';

describe('RatingSummaryComponent', () => {
  function render(summary: RatingSummary): HTMLElement {
    TestBed.configureTestingModule({ imports: [RatingSummaryComponent] });
    const fixture = TestBed.createComponent(RatingSummaryComponent);
    fixture.componentRef.setInput('summary', summary);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('sem avaliações mostra o aviso', () => {
    const element = render({ average: null, total: 0, highlights: [] });

    expect(element.textContent).toContain('Ainda sem avaliações');
    expect(element.querySelector('ui-star-rating')).toBeNull();
  });

  it('mostra média, total e destaques recebidos', () => {
    const element = render({
      average: 4.5,
      total: 2,
      highlights: [
        { code: 'PONTUALIDADE', label: 'Pontualidade', positive: true, total: 2 },
        { code: 'ATRASO', label: 'Atraso', positive: false, total: 1 },
      ],
    });

    expect(element.querySelector('.ui-rating-summary__average')!.textContent!.trim()).toBe('4,5');
    expect(element.textContent).toContain('2 avaliações');
    expect(element.textContent).toContain('Pontualidade · 2');
    expect(element.textContent).toContain('Atraso · 1');
  });
});
