import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ValidationProfile } from '../../../core/models';
import { MyValidationComponent } from '../my-validation/my-validation.component';

@Component({
  selector: 'app-documents-page',
  standalone: true,
  imports: [MyValidationComponent],
  template: `
    <section class="documents-page">
      <header class="documents-page__header">
        <h1 class="documents-page__title">Documentos</h1>
        <p class="documents-page__subtitle">
          CPF, documento de identidade, data de nascimento, gênero{{ profile === 'professional' ? ', CNPJ e registro' : '' }}
          e os documentos enviados. Toda alteração passa pela validação do administrador.
        </p>
      </header>
      <app-my-validation [profile]="profile"></app-my-validation>
    </section>
  `,
  styleUrl: './documents-page.component.scss',
})
export class DocumentsPageComponent {
  protected readonly profile: ValidationProfile = inject(ActivatedRoute).snapshot.data['role'];
}
