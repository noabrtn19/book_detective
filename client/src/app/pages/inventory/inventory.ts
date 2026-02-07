import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { InventoryUploadComponent } from './inventory-upload/inventory-upload';
import { InventoryPreviewComponent } from './inventory-preview/inventory-preview';
import { InventoryTuningComponent } from './inventory-tuning/inventory-tuning';
import { InventoryQrcodeComponent } from './inventory-qrcode/inventory-qrcode';
import { InventoryDetectionComponent } from './inventory-detection/inventory-detection';
import { BookRecord } from '../../models/book_record.model'
import { DetectionParams } from '../../models/detection_params.model';

// Stores raw CSV data as parsed from file
interface CsvRow {
  [key: string]: string;
}

// Represents a column with detection confidence
interface DetectedColumn {
  name: string; // Original column name from CSV
  detectedLabel: string | null; // Detected required field label (Title, Author, Editor, ISBN)
  confidence: number; // Confidence score 0-1 for auto-detection
}

// Maps CSV columns to required book fields
interface ColumnMapping {
  [key: string]: 'title' | 'author' | 'editor' | 'isbn' | 'quantity' | null;
}

type PipelineStep = 'upload' | 'preview' | 'tuning' | 'qrcode' | 'detection';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule,
    InventoryUploadComponent,
    InventoryPreviewComponent,
    InventoryTuningComponent,
    InventoryQrcodeComponent,
    InventoryDetectionComponent
  ],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css'
})
export class InventoryComponent {
  // Pipeline state
  currentStep = signal<PipelineStep>('upload');
  csvData = signal<BookRecord[]>([]);

  // CSV upload
  uploadError = signal<string>('');
  isUploading = signal<boolean>(false);
  file: File | null = null;

  // Column detection state
  rawCsvRows = signal<CsvRow[]>([]);
  detectedColumns = signal<DetectedColumn[]>([]);
  columnMappings = signal<ColumnMapping>({});
  isQuantityAssigned = signal<boolean>(false); // Track if quantity column is assigned
  quantityWarningMessage = signal<string>(''); // Warning message when quantity is not assigned

  // Detection params
  detection_params = signal<DetectionParams>({
    yolo_conf_threshold: 0.25,
    match_conf_threshold: 50.0,
    match_ambiguity_ratio: 1.3,
  });

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

  // Handle file upload from child component
  handleFileUpload(file: File) {
    this.file = file;

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
        this.currentStep.set('preview');
      } catch (error) {
        this.uploadError.set('Erreur lors de la lecture du fichier CSV');
      }
    };

    reader.readAsText(file);
  }

  // Detects required columns (Title, Author, Editor, ISBN, Quantity) with tolerance
  // Supports case-insensitive, French/English language variations
  private detectColumnLabels(headers: string[]): DetectedColumn[] {
    const requiredFields = ['title', 'author', 'editor', 'isbn', 'quantity'];

    // Define synonyms for each required field with language support
    const fieldSynonyms: Record<string, string[]> = {
      'title': ['title', 'titre', 'nom', 'book', 'livre'],
      'author': ['author', 'auteur', 'writer', 'écrivain'],
      'editor': ['editor', 'éditeur', 'editeur', 'publisher'],
      'isbn': ['isbn'],
      'quantity': ['quantity', 'quantité', 'qty', 'qte', 'nombre', 'count']
    };

    return headers.map((headerName) => {
      const lowerHeader = headerName.toLowerCase().trim();
      let detectedLabel: string | null = null;
      let confidence = 0;

      // Try to match against required fields
      for (const field of requiredFields) {
        const synonyms = fieldSynonyms[field];
        for (const synonym of synonyms) {
          if (lowerHeader === synonym) {
            // Exact match
            detectedLabel = field;
            confidence = 1.0;
            break;
          } else if (lowerHeader.includes(synonym)) {
            // Partial match
            const matchConfidence = synonym.length / lowerHeader.length;
            if (matchConfidence > confidence) {
              detectedLabel = field;
              confidence = matchConfidence;
            }
          }
        }
        if (confidence === 1.0) break;
      }

      return {
        name: headerName,
        detectedLabel: confidence > 0.6 ? detectedLabel : null,
        confidence: confidence > 0.6 ? confidence : 0
      };
    });
  }

  // Parse CSV and extract all columns while detecting required fields
  private parseCSV(content: string): BookRecord[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      return [];
    }

    // Extract headers (preserve original case)
    const headers = lines[0].split(',').map(h => h.trim());

    // Detect column labels for required fields
    const detectedColumns = this.detectColumnLabels(headers);
    this.detectedColumns.set(detectedColumns);

    // Initialize column mappings based on detection
    const initialMappings: ColumnMapping = {};
    detectedColumns.forEach(col => {
      if (col.detectedLabel) {
        initialMappings[col.name] = col.detectedLabel as any;
      } else {
        initialMappings[col.name] = null;
      }
    });
    this.columnMappings.set(initialMappings);

    // Parse all data rows as raw CSV rows
    const rawRows: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      const row: CsvRow = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rawRows.push(row);
    }

    this.rawCsvRows.set(rawRows);

    // Convert raw rows to book records using current column mappings
    return this.convertRawRowsToBookRecords(rawRows, initialMappings, headers);
  }

  // Converts raw CSV rows to structured book records using column mapping
  private convertRawRowsToBookRecords(
    rawRows: CsvRow[],
    mappings: ColumnMapping,
    headers: string[]
  ): BookRecord[] {
    const records: BookRecord[] = [];

    // Find which CSV column maps to each required field
    const columnIndexMap: { [key: string]: string | undefined } = {
      'title': undefined,
      'author': undefined,
      'editor': undefined,
      'isbn': undefined,
      'quantity': undefined
    };

    for (const [csvColumn, fieldLabel] of Object.entries(mappings)) {
      if (fieldLabel) {
        columnIndexMap[fieldLabel] = csvColumn;
      }
    }

    // Title, author, and ISBN are required
    if (!columnIndexMap['title'] || !columnIndexMap['author'] || !columnIndexMap['isbn']) {
      throw new Error('CSV must contain title, author, and ISBN columns');
    }

    // Check if quantity column is assigned and set warning if not
    const quantityAssigned = !!columnIndexMap['quantity'];
    this.isQuantityAssigned.set(quantityAssigned);

    if (!quantityAssigned) {
      this.quantityWarningMessage.set(
        'La colonne Quantité n\'est pas assignée. Les quantités seront définies à 1 pour chaque livre.'
      );
    } else {
      this.quantityWarningMessage.set('');
    }

    // Convert each raw row to a book record
    for (const row of rawRows) {
      const record: BookRecord = {
        title: row[columnIndexMap['title']!] || '',
        author: row[columnIndexMap['author']!] || '',
        isbn: row[columnIndexMap['isbn']!] || ''
      };

      if (columnIndexMap['editor']) {
        record.editor = row[columnIndexMap['editor']] || undefined;
      }

      // Handle quantity field
      if (columnIndexMap['quantity']) {
        const qtyValue = row[columnIndexMap['quantity']];
        record.quantity = qtyValue ? parseInt(qtyValue, 10) || 1 : 1;
      } else {
        record.quantity = 1; // Default to 1 if not assigned
      }

      // Only include records with title, author, and ISBN
      if (record.title && record.author && record.isbn) {
        records.push(record);
      }
    }

    return records;
  }

  // Handle column mapping change from select dropdown
  onColumnMappingChange(columnName: string, event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const fieldLabel = selectElement.value;

    const currentMappings = this.columnMappings();
    const updatedMappings: ColumnMapping = { ...currentMappings };

    if (fieldLabel === '') {
      updatedMappings[columnName] = null;
    } else {
      updatedMappings[columnName] = fieldLabel as 'title' | 'author' | 'editor' | 'isbn';
    }

    this.updateColumnMapping(updatedMappings);
  }

  // Update column mapping and refresh book records
  private updateColumnMapping(mappings: ColumnMapping) {
    this.columnMappings.set(mappings);

    const rawRows = this.rawCsvRows();
    const headers = Array.from(new Set(rawRows.flatMap(row => Object.keys(row))));

    try {
      const updatedRecords = this.convertRawRowsToBookRecords(rawRows, mappings, headers);
      this.csvData.set(updatedRecords);
    } catch (error) {
      this.uploadError.set('Erreur lors de la mise à jour des données');
    }
  }

  // Move to next step
  moveToNextStep() {
    const steps: PipelineStep[] = ['upload', 'preview', 'tuning', 'qrcode', 'detection'];
    const currentIndex = steps.indexOf(this.currentStep());

    if (steps[currentIndex] == "tuning") {
      this.sendDataToBackend();
      return;
    }
    
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

  // Send CSV + detection params to backend
  private sendDataToBackend() {
    this.isUploading.set(true);
    this.uploadError.set(''); // Reset des erreurs précédentes

    let token: string | null = this.authService.getToken();
    if (token == null) {
      this.isUploading.set(false);
      this.router.navigate(['/login']);
      return
    }

    this.file = this.generateStandardizedCsvFile();
    if (this.file == null) {
      this.isUploading.set(false);
      const msg = "Fichier CSV invalide.";
        this.uploadError.set(msg);
        return
    }

    this.apiService.uploadInventoryCsv(this.file, this.detection_params(), token).subscribe({
      next: (response) => {
        console.log('Succès:', response);
        this.isUploading.set(false);
        // On force le passage à l'étape suivante uniquement si l'API répond succès
        this.currentStep.set('qrcode');
      },
      error: (err) => {
        console.error('Erreur API:', err);
        this.isUploading.set(false);
        // Affiche l'erreur à l'utilisateur (ex: 401 Unauthorized ou 422 Validation)
        const msg = err.error?.detail || "Erreur lors de la sauvegarde de l'inventaire.";
        this.uploadError.set(msg);
      }
    });
  }

  /**
   * Génère un nouveau fichier CSV.
   * - Les colonnes mappées sont renommées (ex: "Titre du livre" -> "title").
   * - Les colonnes non mappées conservent leur nom d'origine et sont incluses.
   */
  private generateStandardizedCsvFile(): File | null {
    const rawRows = this.rawCsvRows();
    const mappings = this.columnMappings();
    
    if (rawRows.length === 0) return null;

    // 1. Récupérer la liste des en-têtes originaux (toutes les colonnes)
    // On se base sur la première ligne pour avoir l'ordre et les clés
    const originalHeaders = Object.keys(rawRows[0]);

    // 2. Construire la nouvelle ligne d'en-tête
    // Pour chaque colonne originale :
    // - Si elle est mappée (ex: mappée vers 'isbn'), on écrit 'isbn'.
    // - Sinon, on garde le nom original (ex: 'Commentaire').
    const finalHeaders = originalHeaders.map(header => {
      const standardLabel = mappings[header];
      // Si standardLabel existe (n'est pas null), on l'utilise, sinon on garde l'original
      return standardLabel ? standardLabel : header;
    });

    // On joint les en-têtes pour la première ligne du CSV
    const headerLine = finalHeaders.join(',');

    // 3. Construire les lignes de données
    const csvLines = rawRows.map(row => {
      // Pour chaque ligne, on parcourt les colonnes dans le même ordre que les en-têtes
      return originalHeaders.map(header => {
        let value = row[header] || '';
        
        // --- Logique de nettoyage et d'échappement CSV (RFC 4180) ---
        
        // Convertir en string et supprimer les retours chariot parasites
        value = value.toString().replace(/\r/g, '').trim();

        // Si la valeur contient des caractères spéciaux (virgule, guillemet, saut de ligne)
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          // On double les guillemets existants (ex: a "quote" -> "a ""quote""")
          // Et on entoure le tout de guillemets
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
      }).join(',');
    });

    // 4. Assembler le contenu final
    const csvContent = [headerLine, ...csvLines].join('\n');

    // 5. Créer l'objet File
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = this.file ? `cleaned_${this.file.name}` : 'inventory_cleaned.csv';
    
    return new File([blob], fileName, { type: 'text/csv' });
  }

  // Reset the pipeline
  resetPipeline() {
    this.currentStep.set('upload');
    this.csvData.set([]);
    this.uploadError.set('');
    this.rawCsvRows.set([]);
    this.detectedColumns.set([]);
    this.columnMappings.set({});
    this.isQuantityAssigned.set(false);
    this.quantityWarningMessage.set('');
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
