import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {
  @ViewChild('featuresSection') featuresSection!: ElementRef;

  constructor(public authService: AuthService) {}

  scrollToFeatures() {
    this.featuresSection?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
  }

  formatUserName(): string | undefined {
    let name = this.authService.getCurrentUser()?.name;
    if (name) {
      return name.substring(0, 1).toUpperCase() + name.substring(1).toLowerCase();
    } else {
      return undefined;
    }
  }
}
