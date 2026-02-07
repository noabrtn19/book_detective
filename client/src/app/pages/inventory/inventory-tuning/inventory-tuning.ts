import { Component, signal, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DetectionParams } from '../../../models/detection_params.model'

@Component({
  selector: 'app-inventory-tuning',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory-tuning.html',
  styleUrls: ['./inventory-tuning.css', '../inventory.css']
})
export class InventoryTuningComponent {

  settings = model.required<DetectionParams>();

  onYoloConfidenceChange(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const value = parseFloat(inputElement.value);
    const safeValue = isNaN(value) ? 25 : value;
    this.settings.update(curr => ({ 
      ...curr, 
      yolo_conf_threshold: safeValue/100
    }));
  }

  onMatchConfidenceChange(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const value = parseFloat(inputElement.value);
    const safeValue = isNaN(value) ? 50.0 : value;
    this.settings.update(curr => ({ 
      ...curr, 
      match_conf_threshold: safeValue 
    }));
  }

  onMatchAmbiguityRatioChange(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const value = parseFloat(inputElement.value);
    const safeValue = isNaN(value) ? 1.3 : value;
    this.settings.update(curr => ({ 
      ...curr, 
      match_ambiguity_ratio: safeValue 
    }));
  }
}
