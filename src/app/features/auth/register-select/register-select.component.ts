import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../shared/ui/card/card.component';

@Component({
  selector: 'app-register-select',
  standalone: true,
  imports: [RouterLink, CardComponent],
  templateUrl: './register-select.component.html',
  styleUrl: './register-select.component.scss',
})
export class RegisterSelectComponent {}
