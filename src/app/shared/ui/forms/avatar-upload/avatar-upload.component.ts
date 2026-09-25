import {
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import Cropper from 'cropperjs';
import { ButtonComponent } from '../../button/button.component';
import { ModalComponent } from '../../layout/modal/modal.component';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const OUTPUT_SIZE = 480;
const MAX_ZOOM_MULTIPLIER = 4;

@Component({
  selector: 'ui-avatar-upload',
  standalone: true,
  imports: [ButtonComponent, ModalComponent],
  templateUrl: './avatar-upload.component.html',
  styleUrl: './avatar-upload.component.scss',
})
export class AvatarUploadComponent {
  label = input('Foto de perfil');

  avatarChange = output<Blob | null>();

  protected readonly previewUrl = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly dragOver = signal(false);
  protected readonly cropperOpen = signal(false);

  private readonly cropperStage =
    viewChild<ElementRef<HTMLDivElement>>('cropperStage');
  private readonly fileInput =
    viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private readonly zoomRange =
    viewChild<ElementRef<HTMLInputElement>>('zoomRange');
  private cropper: Cropper | null = null;
  private sourceUrl: string | null = null;
  private minZoom = 0;
  private maxZoom = Infinity;

  protected triggerFileInput(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.handleFile(file);
  }

  protected onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    this.handleFile(event.dataTransfer?.files?.[0] ?? null);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  protected onDragLeave(): void {
    this.dragOver.set(false);
  }

  private handleFile(file: File | null): void {
    if (!file) {
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      this.error.set('Formato inválido. Envie uma imagem JPG, PNG ou WEBP.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.error.set('A imagem deve ter no máximo 5MB.');
      return;
    }

    this.error.set(null);
    this.sourceUrl = URL.createObjectURL(file);
    this.cropperOpen.set(true);

    setTimeout(() => this.mountCropper(), 0);
  }

  private mountCropper(): void {
    const stage = this.cropperStage()?.nativeElement;

    if (!stage || !this.sourceUrl) {
      return;
    }

    stage.replaceChildren();

    const image = document.createElement('img');
    image.alt = 'Imagem para recorte';
    image.style.display = 'none';
    image.style.maxWidth = '100%';

    image.onload = () => {
      this.cropper?.destroy();
      this.cropper = new Cropper(image, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        background: false,
        autoCropArea: 1,
        responsive: true,
        zoomOnWheel: true,
        cropBoxMovable: true,
        cropBoxResizable: false,
        guides: false,
        center: false,
        highlight: false,
        ready: () => this.onCropperReady(),
        zoom: (event: CustomEvent<{ ratio: number }>) => {
          const ratio = event.detail.ratio;
          const clamped = Math.min(Math.max(ratio, this.minZoom), this.maxZoom);

          if (clamped !== ratio) {
            event.preventDefault();
            this.cropper?.zoomTo(clamped);
            return;
          }

          const range = this.zoomRange()?.nativeElement;
          if (range) {
            range.value = String(ratio);
          }
        },
      });
    };

    stage.appendChild(image);
    image.src = this.sourceUrl;
  }

  private onCropperReady(): void {
    const cropper = this.cropper;
    const range = this.zoomRange()?.nativeElement;

    if (!cropper || !range) {
      return;
    }

    const containerData = cropper.getContainerData();
    const boxSize = Math.min(containerData.width, containerData.height);

    const { naturalWidth, naturalHeight } = cropper.getImageData();
    const coverRatio = Math.max(
      boxSize / naturalWidth,
      boxSize / naturalHeight,
    );
    cropper.zoomTo(coverRatio);

    const cropBoxData = (
      cropper as unknown as {
        cropBoxData: { maxWidth: number; maxHeight: number };
      }
    ).cropBoxData;
    cropBoxData.maxWidth = containerData.width;
    cropBoxData.maxHeight = containerData.height;

    cropper.setCropBoxData({
      left: (containerData.width - boxSize) / 2,
      top: (containerData.height - boxSize) / 2,
      width: boxSize,
      height: boxSize,
    });

    const finalCropBoxData = cropper.getCropBoxData();
    const canvasData = cropper.getCanvasData();
    cropper.setCanvasData({
      left:
        finalCropBoxData.left - (canvasData.width - finalCropBoxData.width) / 2,
      top:
        finalCropBoxData.top -
        (canvasData.height - finalCropBoxData.height) / 2,
    });

    this.minZoom = coverRatio;
    this.maxZoom = coverRatio * MAX_ZOOM_MULTIPLIER;

    range.min = String(this.minZoom);
    range.max = String(this.maxZoom);
    range.step = String(coverRatio / 100);
    range.value = String(coverRatio);
  }

  protected onZoomChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.cropper?.zoomTo(value);
  }

  protected confirmCrop(): void {
    const cropper = this.cropper;

    if (!cropper) {
      return;
    }

    const canvas = cropper.getCroppedCanvas({
      width: OUTPUT_SIZE,
      height: OUTPUT_SIZE,
      imageSmoothingQuality: 'high',
    });

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return;
        }

        const previous = this.previewUrl();
        if (previous) {
          URL.revokeObjectURL(previous);
        }

        this.previewUrl.set(URL.createObjectURL(blob));
        this.avatarChange.emit(blob);
        this.closeCropper();
      },
      'image/jpeg',
      0.9,
    );
  }

  protected closeCropper(): void {
    this.cropperOpen.set(false);
    this.cropper?.destroy();
    this.cropper = null;
    this.minZoom = 0;
    this.maxZoom = Infinity;
    this.cropperStage()?.nativeElement.replaceChildren();

    if (this.sourceUrl) {
      URL.revokeObjectURL(this.sourceUrl);
      this.sourceUrl = null;
    }
  }

  protected removeAvatar(): void {
    const previous = this.previewUrl();
    if (previous) {
      URL.revokeObjectURL(previous);
    }

    this.previewUrl.set(null);
    this.error.set(null);
    this.avatarChange.emit(null);
  }
}
