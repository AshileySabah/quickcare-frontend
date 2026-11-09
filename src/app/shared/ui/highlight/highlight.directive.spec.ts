import { Component, signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HighlightService } from '../../../core/services/highlight.service';
import { HighlightDirective } from './highlight.directive';

@Component({
  standalone: true,
  imports: [HighlightDirective],
  template: `
    @for (id of ids(); track id) {
      <div class="item" [uiHighlight]="'proposta-' + id">{{ id }}</div>
    }
  `,
})
class HostComponent {
  readonly ids = signal<string[]>([]);
}

describe('HighlightDirective', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([{ path: 'tela', component: HostComponent }])],
    });
    spyOn(Element.prototype, 'scrollIntoView');
  });

  it('destaca o item pedido, mesmo que ele apareça depois do pedido', fakeAsync(() => {
    const fixture = TestBed.createComponent(HostComponent);
    TestBed.inject(HighlightService).request('proposta-2');
    fixture.detectChanges();

    fixture.componentInstance.ids.set(['1', '2']);
    fixture.detectChanges();
    tick();

    const items = fixture.nativeElement.querySelectorAll('.item') as NodeListOf<HTMLElement>;
    expect(items[0].classList).not.toContain('ui-highlight--active');
    expect(items[1].classList).toContain('ui-highlight--active');
    expect(items[1].scrollIntoView).toHaveBeenCalled();

    tick(3600);
    expect(items[1].classList).not.toContain('ui-highlight--active');
  }));

  it('lê o item a destacar do parâmetro da URL', fakeAsync(() => {
    const service = TestBed.inject(HighlightService);

    TestBed.inject(Router).navigateByUrl('/tela?destaque=proposta-7');
    tick();

    expect(service.target()?.key).toBe('proposta-7');
  }));
});
