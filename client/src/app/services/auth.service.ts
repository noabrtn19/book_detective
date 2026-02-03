import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser = signal<User | null>(null);
  private isAuth = signal(false);
  private token = signal<string | null>(null);

  constructor(private router: Router, private apiService: ApiService) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage() {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('currentUser');

    if (storedToken && storedUser) {
      this.token.set(storedToken);
      this.currentUser.set(JSON.parse(storedUser));
      this.isAuth.set(true);
    }
  }

  register(email: string, password: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiService.register(email, password, name).subscribe({
        next: (response) => {
          this.currentUser.set(response.user);
          this.token.set(response.token);
          this.isAuth.set(true);
          localStorage.setItem('authToken', response.token);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          resolve();
        },
        error: (error) => {
          const errorMessage = error.error?.error || 'Erreur lors de l\'enregistrement';
          reject(new Error(errorMessage));
        }
      });
    });
  }

  login(email: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiService.login(email, password).subscribe({
        next: (response) => {
          this.currentUser.set(response.user);
          this.token.set(response.token);
          this.isAuth.set(true);
          localStorage.setItem('authToken', response.token);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          resolve();
        },
        error: (error) => {
          const errorMessage = error.error?.error || 'Erreur lors de la connexion';
          reject(new Error(errorMessage));
        }
      });
    });
  }

  logout() {
    const token = this.token();
    if (token) {
      this.apiService.logout(token).subscribe({
        next: () => {
          this.performLogout();
        },
        error: () => {
          // Even if API call fails, perform local logout
          this.performLogout();
        }
      });
    } else {
      this.performLogout();
    }
  }

  private performLogout() {
    this.currentUser.set(null);
    this.token.set(null);
    this.isAuth.set(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/home']);
  }

  isAuthenticated() {
    return this.isAuth();
  }

  getCurrentUser() {
    return this.currentUser();
  }

  getToken() {
    return this.token();
  }
}
