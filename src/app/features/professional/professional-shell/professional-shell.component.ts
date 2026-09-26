import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { AvatarComponent } from '../../../shared/ui/feedback/avatar/avatar.component';

@Component({
  selector: 'app-professional-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonComponent, AvatarComponent],
  templateUrl: './professional-shell.component.html',
  styleUrl: './professional-shell.component.scss',
})
export class ProfessionalShellComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.authService.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }
}
