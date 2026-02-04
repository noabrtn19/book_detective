import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inventory-tuning',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory-tuning.html',
  styleUrls: ['./inventory-tuning.css', '../inventory.css']
})
export class InventoryTuningComponent {
  confidenceThreshold = signal(75);
  detectionSensitivity = signal(80);
  showRealtimePredictions = signal(true);
  requestConfirmation = signal(true);

  onConfidenceChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.confidenceThreshold.set(parseInt(value, 10));
  }

  onSensitivityChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.detectionSensitivity.set(parseInt(value, 10));
  }
}
