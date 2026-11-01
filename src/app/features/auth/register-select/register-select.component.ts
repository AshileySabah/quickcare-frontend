import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { AuthLayoutComponent } from '../../../shared/ui/layout/auth-layout/auth-layout.component';

@Component({
  selector: 'app-register-select',
  standalone: true,
  imports: [AuthLayoutComponent, RouterLink, CardComponent],
  templateUrl: './register-select.component.html',
  styleUrl: './register-select.component.scss',
})
export class RegisterSelectComponent {}
