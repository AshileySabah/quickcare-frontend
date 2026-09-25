import { Component, input, output } from '@angular/core';
import { CardComponent } from '../card/card.component';
import { DocumentUploaderComponent, UploadedDocument } from '../document-uploader/document-uploader.component';
import { SelectOption } from '../select/select.component';

@Component({
  selector: 'ui-documents-card',
  standalone: true,
  imports: [CardComponent, DocumentUploaderComponent],
  templateUrl: './documents-card.component.html',
  styleUrl: './documents-card.component.scss',
})
export class DocumentsCardComponent {
  label = input.required<string>();
  typeOptions = input.required<SelectOption[]>();
  errorMessage = input<string | null>(null);

  documentsChange = output<UploadedDocument[]>();
}
