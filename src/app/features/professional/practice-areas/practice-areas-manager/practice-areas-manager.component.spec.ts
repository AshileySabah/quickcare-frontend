import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MyPracticeArea, PracticeAreaImpact } from '../../../../core/models';
import { PracticeAreaService } from '../../../../core/services/practice-area.service';
import { SpecialtyService } from '../../../../core/services/specialty.service';
import { UfService } from '../../../../core/services/uf.service';
import { ToastService } from '../../../../shared/ui/feedback/toast/toast.service';
import { PracticeAreasManagerComponent } from './practice-areas-manager.component';

function area(id: string, label: string, category: MyPracticeArea['area']['category']): MyPracticeArea {
  return {
    area: {
      id,
      category,
      categoryLabel: label,
      label,
      registrationLabel: category === 'CUIDADOR' ? null : 'COREN',
      specialties: [{ id: '5', name: 'Curativos', category }],
      registrationNumber: category === 'CUIDADOR' ? null : '123456',
      registrationUf: category === 'CUIDADOR' ? null : 'SP',
    },
    registrationStatus: category === 'CUIDADOR' ? null : 'aprovada',
    released: true,
  };
}

const ENFERMEIRO = area('200', 'Enfermeiro(a)', 'ENFERMEIRO');
const CUIDADOR = area('201', 'Cuidador(a)', 'CUIDADOR');

describe('PracticeAreasManagerComponent', () => {
  let practiceAreaService: jasmine.SpyObj<PracticeAreaService>;
  let toast: jasmine.SpyObj<ToastService>;

  function render(areas: MyPracticeArea[]) {
    practiceAreaService = jasmine.createSpyObj<PracticeAreaService>('PracticeAreaService', [
      'list',
      'impact',
      'remove',
      'updateSpecialties',
      'include',
    ]);
    practiceAreaService.list.and.returnValue(of(areas));
    practiceAreaService.remove.and.returnValue(of([CUIDADOR]));
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);
    TestBed.configureTestingModule({
      imports: [PracticeAreasManagerComponent],
      providers: [
        { provide: PracticeAreaService, useValue: practiceAreaService },
        { provide: SpecialtyService, useValue: { list: () => of([]), listCategories: () => of([]) } },
        { provide: UfService, useValue: { list: () => of([]) } },
        { provide: ToastService, useValue: toast },
      ],
    });
    const fixture = TestBed.createComponent(PracticeAreasManagerComponent);
    fixture.detectChanges();
    return fixture;
  }

  function impact(value: Partial<PracticeAreaImpact>): PracticeAreaImpact {
    return { allowed: true, blocker: null, proposals: [], ...value };
  }

  it('com uma atuação só, não oferece remover', () => {
    const element: HTMLElement = render([ENFERMEIRO]).nativeElement;

    expect(element.textContent).toContain('Enfermeiro(a)');
    expect(element.querySelector('button[aria-label="Remover Enfermeiro(a)"]')).toBeNull();
  });

  it('sem nada aberto, remove direto', () => {
    const fixture = render([ENFERMEIRO, CUIDADOR]);
    practiceAreaService.impact.and.returnValue(of(impact({})));

    (fixture.nativeElement.querySelector('button[aria-label="Remover Enfermeiro(a)"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(practiceAreaService.remove).toHaveBeenCalledWith('200');
    expect(toast.success).toHaveBeenCalledWith('Atuação removida.');
  });

  it('com propostas abertas, explica no modal antes de remover', () => {
    const fixture = render([ENFERMEIRO, CUIDADOR]);
    practiceAreaService.impact.and.returnValue(
      of(
        impact({
          proposals: [
            {
              proposalId: '100',
              requestId: '50',
              service: 'Enfermeiro(a) — Curativos',
              status: 'aceita',
              startsAt: '2026-11-20T11:00:00Z',
              endsAt: '2026-11-20T19:00:00Z',
              createsOccurrence: true,
            },
          ],
        }),
      ),
    );

    (fixture.nativeElement.querySelector('button[aria-label="Remover Enfermeiro(a)"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(practiceAreaService.remove).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('a proposta abaixo será cancelada');
    expect(document.body.textContent).toContain('conta como ocorrência para você');
    expect(document.body.textContent).toContain('Sim, remover a atuação');
    expect(document.body.textContent).toContain('Não, manter a atuação');

    (fixture.componentInstance as unknown as { confirmPending(): void }).confirmPending();
    expect(practiceAreaService.remove).toHaveBeenCalledWith('200');
  });

  it('com atendimento em andamento, avisa e não remove', () => {
    const fixture = render([ENFERMEIRO, CUIDADOR]);
    practiceAreaService.impact.and.returnValue(of(impact({ allowed: false, blocker: 'Há atendimento em andamento.' })));

    (fixture.nativeElement.querySelector('button[aria-label="Remover Enfermeiro(a)"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(toast.error).toHaveBeenCalledWith('Há atendimento em andamento.');
    expect(practiceAreaService.remove).not.toHaveBeenCalled();
  });
});
