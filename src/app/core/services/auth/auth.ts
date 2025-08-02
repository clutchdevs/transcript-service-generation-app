import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Observable, from } from 'rxjs';
import { Api, ApiResponse } from '../api/api';

// Interfaces for authentication
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface MessageResponse {
  statusCode: number;
  message: string;
}

// Centralized auth state interface
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
};

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private api = inject(Api);

  // Centralized state signal
  private authState = signal<AuthState>(initialState);

  // Computed signals for public access
  public readonly user = computed(() => this.authState().user);
  public readonly isAuthenticated = computed(() => this.authState().isAuthenticated);
  public readonly isLoading = computed(() => this.authState().isLoading);
  public readonly error = computed(() => this.authState().error);

  constructor() {
    // Check authentication status on service initialization
    this.checkAuthStatus();
  }

    /**
   * Login user with email and password
   * @param credentials - Login credentials
   */
  async login(credentials: LoginRequest): Promise<void> {
    this.updateLoading(true);
    this.clearError();

    try {
      const response = await this.api.post<AuthResponse>('/api/auth/login', credentials).toPromise();

      if (response?.success && response.data) {
        this.setTokens(response.data.accessToken, response.data.refreshToken);
        this.updateUser(response.data.user);
        this.updateAuthState(true);
      } else {
        this.setError(response?.error || 'Login failed');
        throw new Error(response?.error || 'Login failed');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Login failed';
      this.setError(errorMessage);
      throw error; // Re-throw to let component handle it
    } finally {
      this.updateLoading(false);
    }
  }

  /**
   * Register new user
   * @param userData - Registration data
   */
  async register(userData: RegisterRequest): Promise<void> {
    this.updateLoading(true);
    this.clearError();

    try {
      const response = await this.api.post<AuthResponse>('/api/auth/register', userData).toPromise();

      if (response?.success && response.data) {
        this.setTokens(response.data.accessToken, response.data.refreshToken);
        this.updateUser(response.data.user);
        this.updateAuthState(true);
      } else {
        this.setError(response?.error || 'Registration failed');
      }
    } catch (error: any) {
      this.setError(error?.message || 'Registration failed');
    } finally {
      this.updateLoading(false);
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    this.updateLoading(true);

    try {
      const token = this.getToken();
      const headers = token ? this.api.createAuthHeader(token) : undefined;
      await this.api.post<MessageResponse>('/api/auth/logout', {}, headers).toPromise();
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearAuthState();
      this.updateLoading(false);
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.api.post<AuthResponse>('/api/auth/refresh-token', { refreshToken }).toPromise();

      if (response?.success && response.data) {
        this.setTokens(response.data.accessToken, response.data.refreshToken);
        this.updateUser(response.data.user);
        this.updateAuthState(true);
        return true;
      }
      return false;
    } catch (error) {
      this.clearAuthState();
      return false;
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<void> {
    this.updateLoading(true);

    try {
      const token = this.getToken();
      const headers = token ? this.api.createAuthHeader(token) : undefined;
      const response = await this.api.get<User>('/api/auth/profile', undefined, headers).toPromise();

      if (response?.success && response.data) {
        this.updateUser(response.data);
      }
    } catch (error: any) {
      this.setError(error?.message || 'Failed to load profile');
    } finally {
      this.updateLoading(false);
    }
  }

  /**
   * Reset password with token
   * @param resetData - Reset password data with token and new password
   */
  async resetPassword(resetData: ResetPasswordRequest): Promise<void> {
    this.updateLoading(true);
    this.clearError();

    try {
      const response = await this.api.post<MessageResponse>('/api/auth/reset-password', resetData).toPromise();

      if (!response?.success) {
        this.setError(response?.error || 'Password reset failed');
      }
    } catch (error: any) {
      this.setError(error?.message || 'Password reset failed');
    } finally {
      this.updateLoading(false);
    }
  }

  // State management methods
  private updateUser(user: User): void {
    this.authState.update(state => ({ ...state, user }));
  }

  private updateAuthState(isAuthenticated: boolean): void {
    this.authState.update(state => ({ ...state, isAuthenticated }));
  }

  private updateLoading(isLoading: boolean): void {
    this.authState.update(state => ({ ...state, isLoading }));
  }

  private setError(error: string): void {
    this.authState.update(state => ({ ...state, error }));
  }

  private clearError(): void {
    this.authState.update(state => ({ ...state, error: null }));
  }

  private clearAuthState(): void {
    this.removeToken();
    this.authState.set(initialState);
  }

  /**
   * Check if user is authenticated on service initialization
   */
  private checkAuthStatus(): void {
    const token = this.getToken();
    if (token) {
      this.updateAuthState(true);
      // Optionally fetch user profile here
      this.getProfile();
    }
  }

  /**
   * Store authentication tokens in localStorage
   * @param accessToken - JWT access token
   * @param refreshToken - JWT refresh token
   */
  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  /**
   * Get authentication token from localStorage
   */
  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Get refresh token from localStorage
   */
  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Remove authentication tokens from localStorage
   */
  private removeToken(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }

  // Legacy Observable methods for backward compatibility
  /**
   * Login user with email and password (Observable version)
   * @param credentials - Login credentials
   */
  login$(credentials: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.api.post<AuthResponse>('/api/auth/login', credentials);
  }

  /**
   * Register new user (Observable version)
   * @param userData - Registration data
   */
  register$(userData: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.api.post<AuthResponse>('/api/auth/register', userData);
  }

  /**
   * Logout current user (Observable version)
   */
  logout$(): Observable<ApiResponse<MessageResponse>> {
    const token = this.getToken();
    const headers = token ? this.api.createAuthHeader(token) : undefined;
    return this.api.post<MessageResponse>('/api/auth/logout', {}, headers);
  }

  /**
   * Refresh authentication token (Observable version)
   */
  refreshToken$(): Observable<ApiResponse<AuthResponse>> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return from(Promise.reject(new Error('No refresh token available')));
    }
    return this.api.post<AuthResponse>('/api/auth/refresh-token', { refreshToken });
  }
}
