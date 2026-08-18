import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { Patient } from '../../../core/models';
import { CardComponent } from '../../../shared/ui/card/card.component';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CardComponent],
  templateUrl: './patient-profile.component.html',
  styleUrl: './patient-profile.component.scss',
})
export class PatientProfileComponent {
  private readonly authService = inject(AuthService);

  protected readonly patient = computed(() => this.authService.currentUser() as Patient | null);
}
