import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import Cropper from 'cropperjs';
import { ButtonComponent } from '../button/button.component';
import { ModalComponent } from '../modal/modal.component';

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

  private readonly cropperStage = viewChild<ElementRef<HTMLDivElement>>('cropperStage');
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private readonly zoomRange = viewChild<ElementRef<HTMLInputElement>>('zoomRange');
  private cropper: Cropper | null = null;
  private sourceUrl: string | null = null;

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

    // The stage <div> only exists once the modal's `@if` renders it, so mount the
    // cropper right after that DOM update instead of inside this same tick.
    setTimeout(() => this.mountCropper(), 0);
  }

  /**
   * Cropper.js clones the <img> it's given and hides the original via a CSS class
   * from cropper.css. To not depend on that stylesheet being loaded (and to keep
   * Angular from ever touching this subtree once the library owns it), the image
   * is created imperatively here and forced invisible with an inline style too.
   */
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
        // Cropper.js has a built-in rule (see `renderCropBox`): once the crop box's
        // size reaches the container's, it automatically switches the box's drag
        // action from "resize/move the box" to "pan the image underneath it" — this
        // is exactly the avatar-cropper behavior we want, and it only engages when
        // the box is movable, even though it never actually leaves the container.
        cropBoxMovable: true,
        cropBoxResizable: false,
        guides: false,
        center: false,
        highlight: false,
        ready: () => this.onCropperReady(),
      });
    };

    stage.appendChild(image);
    image.src = this.sourceUrl;
  }

  /**
   * By default Cropper sizes the crop box relative to the *image's own auto-fit
   * canvas* (`autoCropArea`), not the container — for a non-square image that
   * canvas is already letterboxed, so the box ends up smaller than the stage too,
   * leaving a dark margin around it. Forcing the box to the container's exact
   * pixel size, then scaling+centering the image to fully cover that box (like CSS
   * `object-fit: cover`), removes that margin regardless of the photo's own shape.
   * That cover ratio also becomes the zoom-out floor: going below it would reopen
   * the gap.
   */
  private onCropperReady(): void {
    const cropper = this.cropper;
    const range = this.zoomRange()?.nativeElement;

    if (!cropper || !range) {
      return;
    }

    const containerData = cropper.getContainerData();
    const boxSize = Math.min(containerData.width, containerData.height);

    // Zoom the canvas to cover the box *before* resizing the box itself. Cropper
    // only ever recomputes the crop box's own min/max size once, during its first
    // (letterboxed) layout — asking for a bigger box beforehand gets silently
    // clamped straight back to those stale limits.
    const { naturalWidth, naturalHeight } = cropper.getImageData();
    const coverRatio = Math.max(boxSize / naturalWidth, boxSize / naturalHeight);
    cropper.zoomTo(coverRatio);

    // No public API re-triggers that size-limit recalculation after the canvas has
    // grown, so the stale limits are widened directly before resizing the box.
    const cropBoxData = (cropper as unknown as { cropBoxData: { maxWidth: number; maxHeight: number } }).cropBoxData;
    cropBoxData.maxWidth = containerData.width;
    cropBoxData.maxHeight = containerData.height;

    cropper.setCropBoxData({
      left: (containerData.width - boxSize) / 2,
      top: (containerData.height - boxSize) / 2,
      width: boxSize,
      height: boxSize,
    });

    // Re-center the (now oversized) canvas under the box; zoomTo alone anchors on
    // the box's pre-resize position, which is no longer accurate.
    const finalCropBoxData = cropper.getCropBoxData();
    const canvasData = cropper.getCanvasData();
    cropper.setCanvasData({
      left: finalCropBoxData.left - (canvasData.width - finalCropBoxData.width) / 2,
      top: finalCropBoxData.top - (canvasData.height - finalCropBoxData.height) / 2,
    });

    range.min = String(coverRatio);
    range.max = String(coverRatio * MAX_ZOOM_MULTIPLIER);
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
