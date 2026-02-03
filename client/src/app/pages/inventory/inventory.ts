import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

interface BookRecord {
  title: string;
  author: string;
  isbn?: string;
  quantity?: number;
}

type PipelineStep = 'upload' | 'preview' | 'tuning' | 'qrcode' | 'detection';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css'
})
export class InventoryComponent {
  // Pipeline state
  currentStep = signal<PipelineStep>('upload');
  csvData = signal<BookRecord[]>([]);
  fileName = signal<string>('');
  showPreview = signal(false);
  uploadError = signal<string>('');
  isDraggingOver = signal(false);

  constructor(
    public authService: AuthService,
    private router: Router,
    private apiService: ApiService
  ) {
    // Redirect to login if not authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  // Handle file drop
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
      this.handleFileUpload(files[0]);
    }
  }

  // Handle file input change
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileUpload(input.files[0]);
    }
  }

  // Parse CSV file and extract book records
  private handleFileUpload(file: File) {
    this.uploadError.set('');

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      this.uploadError.set('Veuillez sélectionner un fichier CSV valide');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const records = this.parseCSV(content);
        
        if (records.length === 0) {
          this.uploadError.set('Le fichier CSV ne contient aucune donnée valide');
          return;
        }

        this.csvData.set(records);
        this.fileName.set(file.name);
        this.showPreview.set(true);
        this.currentStep.set('preview');
      } catch (error) {
        this.uploadError.set('Erreur lors de la lecture du fichier CSV');
      }
    };

    reader.readAsText(file);
  }

  // Simple CSV parser (handles title, author, isbn, quantity columns)
  private parseCSV(content: string): BookRecord[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      return [];
    }

    // Parse header
    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map(h => h.trim());
    
    // Find column indices (flexible mapping)
    const titleIdx = headers.findIndex(h => 
      h.includes('title') || h.includes('titre') || h.includes('nom')
    );
    const authorIdx = headers.findIndex(h => 
      h.includes('author') || h.includes('auteur')
    );
    const isbnIdx = headers.findIndex(h => 
      h.includes('isbn')
    );
    const quantityIdx = headers.findIndex(h => 
      h.includes('quantity') || h.includes('quantité') || h.includes('qty')
    );

    if (titleIdx === -1 || authorIdx === -1) {
      throw new Error('CSV must contain title and author columns');
    }

    // Parse data rows
    const records: BookRecord[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      const record: BookRecord = {
        title: values[titleIdx] || '',
        author: values[authorIdx] || '',
        isbn: isbnIdx !== -1 ? values[isbnIdx] || undefined : undefined,
        quantity: quantityIdx !== -1 ? parseInt(values[quantityIdx], 10) || 1 : 1
      };

      if (record.title && record.author) {
        records.push(record);
      }
    }

    return records;
  }

  // Move to next step
  moveToNextStep() {
    const steps: PipelineStep[] = ['upload', 'preview', 'tuning', 'qrcode', 'detection'];
    const currentIndex = steps.indexOf(this.currentStep());
    
    if (currentIndex < steps.length - 1) {
      this.currentStep.set(steps[currentIndex + 1]);
    }
  }

  // Move to previous step
  moveToPreviousStep() {
    const steps: PipelineStep[] = ['upload', 'preview', 'tuning', 'qrcode', 'detection'];
    const currentIndex = steps.indexOf(this.currentStep());
    
    if (currentIndex > 0) {
      this.currentStep.set(steps[currentIndex - 1]);
    }
  }

  // Reset the pipeline
  resetPipeline() {
    this.currentStep.set('upload');
    this.csvData.set([]);
    this.fileName.set('');
    this.showPreview.set(false);
    this.uploadError.set('');
  }

  // Get display name for current step
  getCurrentStepName(): string {
    const stepNames: Record<PipelineStep, string> = {
      'upload': 'Importer CSV',
      'preview': 'Aperçu des données',
      'tuning': 'Paramétrer la détection',
      'qrcode': 'Code QR',
      'detection': 'Détection en cours'
    };
    return stepNames[this.currentStep()];
  }

  // Check if user can proceed to next step
  canProceedToNextStep(): boolean {
    if (this.currentStep() === 'upload') {
      return this.csvData().length > 0;
    }
    return true;
  }

  // Format number for display
  formatNumber(num: number | undefined): number {
    return num || 0;
  }
}
