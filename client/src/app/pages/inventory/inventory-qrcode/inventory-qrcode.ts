import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inventory-qrcode',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory-qrcode.html',
  styleUrls: ['./inventory-qrcode.css', '../inventory.css']
})
export class InventoryQrcodeComponent {}
