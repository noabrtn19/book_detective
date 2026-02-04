import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inventory-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory-upload.html',
  styleUrl: './inventory-upload.css'
})
export class InventoryUploadComponent {
  isDraggingOver = signal(false);
  fileName = signal<string>('');

  // Inputs from parent
  uploadError = input<string>('');
  recordCount = input<number>(0);

  // Outputs
  fileUploaded = output<File>();

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDraggingOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDraggingOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDraggingOver.set(false);
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      // Parent component will handle the error
      this.fileUploaded.emit(file);
      return;
    }

    this.fileName.set(file.name);
    this.fileUploaded.emit(file);
  }

  reset() {
    this.fileName.set('');
    this.isDraggingOver.set(false);
  }
}
