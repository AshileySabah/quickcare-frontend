import { Component } from '@angular/core';
import { MyValidationComponent } from '../../validation/my-validation/my-validation.component';

@Component({
  selector: 'app-patient-validation',
  standalone: true,
  imports: [MyValidationComponent],
  template: `
    <section class="patient-validation">
      <header class="patient-validation__header">
        <h1 class="patient-validation__title">Validação do meu cadastro</h1>
        <p class="patient-validation__subtitle">
          Você pode criar solicitações assim que seu cadastro for aprovado pela nossa equipe.
        </p>
      </header>
      <app-my-validation profile="patient"></app-my-validation>
    </section>
  `,
  styleUrl: './patient-validation.component.scss',
})
export class PatientValidationComponent {}
