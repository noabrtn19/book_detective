import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthResponse, User } from '../models/user.model';

export interface UserResponse {
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) {}

  register(email: string, password: string, name: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`api/auth/register`, {
      email,
      password,
      name
    });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`api/auth/login`, {
      email,
      password
    });
  }

  getCurrentUser(token: string): Observable<UserResponse> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.get<UserResponse>(`api/auth/me`, { headers });
  }

  logout(token: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.post(`api/auth/logout`, {}, { headers });
  }

  uploadInventoryCsv(file: File, token: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.post(`api/inventory/upload-csv`, formData, { headers });
  }
}
