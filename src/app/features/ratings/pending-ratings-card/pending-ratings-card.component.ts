import { DatePipe } from '@angular/common';
import { Component, OnInit, input } from '@angular/core';
import { createPagination } from '../../../core/lists/pagination';
import { SwitchableRole } from '../../../core/models';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { HighlightDirective } from '../../../shared/ui/highlight/highlight.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PaginatorComponent } from '../../../shared/ui/paginator/paginator.component';
import { RatingDialogComponent } from '../rating-dialog/rating-dialog.component';
import { createRatingFlow } from '../rating-flow';

@Component({
  selector: 'app-pending-ratings-card',
  standalone: true,
  imports: [DatePipe, ButtonComponent, HighlightDirective, IconComponent, PaginatorComponent, RatingDialogComponent],
  templateUrl: './pending-ratings-card.component.html',
  styleUrl: './pending-ratings-card.component.scss',
})
export class PendingRatingsCardComponent implements OnInit {
  role = input.required<SwitchableRole>();

  protected readonly flow = createRatingFlow(() => this.role());
  protected readonly pager = createPagination(this.flow.pending);

  ngOnInit(): void {
    this.flow.load();
  }

  protected otherSide(): string {
    return this.role() === 'patient' ? 'o profissional' : 'o paciente';
  }
}
