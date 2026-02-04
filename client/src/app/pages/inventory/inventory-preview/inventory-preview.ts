import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DetectedColumn {
  name: string;
  detectedLabel: string | null;
  confidence: number;
}

interface CsvRow {
  [key: string]: string;
}

interface ColumnMapping {
  [key: string]: 'title' | 'author' | 'editor' | 'isbn' | 'quantity' | null;
}

@Component({
  selector: 'app-inventory-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory-preview.html',
  styleUrl: './inventory-preview.css'
})
export class InventoryPreviewComponent {
  // Inputs
  detectedColumns = input<DetectedColumn[]>([]);
  columnMappings = input<ColumnMapping>({});
  rawCsvRows = input<CsvRow[]>([]);
  bookCount = input<number>(0);
  quantityWarningMessage = input<string>('');

  // Outputs
  columnMappingChanged = output<{ columnName: string; event: Event }>();

  onColumnMappingChange(columnName: string, event: Event) {
    this.columnMappingChanged.emit({ columnName, event });
  }
}
