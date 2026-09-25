import { Component, input, output } from '@angular/core';
import { CardComponent } from '../../layout/card/card.component';
import { DocumentUploaderComponent, UploadedDocument } from '../../forms/document-uploader/document-uploader.component';
import { SelectOption } from '../../forms/select/select.component';

@Component({
  selector: 'ui-documents-card',
  standalone: true,
  imports: [CardComponent, DocumentUploaderComponent],
  templateUrl: './documents-card.component.html',
  styleUrl: './documents-card.component.scss',
})
export class DocumentsCardComponent {
  typeOptions = input.required<SelectOption[]>();
  errorMessage = input<string | null>(null);

  documentsChange = output<UploadedDocument[]>();
}
