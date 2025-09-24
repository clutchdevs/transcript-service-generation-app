import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, from, firstValueFrom } from 'rxjs';
import { Api, ApiResponse } from '../api/api';

// Interfaces for authentication
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
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

export interface RegisterResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
}

// Backend DTOs
interface UserProfileDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// Structured error thrown by Api service
interface ValidationIssue {
  path: Array<string | number>;
  validation?: string;
  code?: string;
  message: string;
}

interface ApiThrownError {
  isApiError?: boolean;
  message: string;
  status?: number;
  issues?: ValidationIssue[];
}

// API endpoints
const AUTH_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  LOGOUT: '/api/auth/logout',
  REFRESH_TOKEN: '/api/auth/refresh-token',
  RESET_PASSWORD: '/api/auth/reset-password',
  FORGOT_PASSWORD: '/api/auth/forgot-password'
} as const;

const USER_ENDPOINTS = {
  PROFILE: '/api/user/profile'
} as const;

export interface ForgotPasswordRequest {
  email: string;
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
      const response = await firstValueFrom(this.api.post<AuthResponse>(AUTH_ENDPOINTS.LOGIN, credentials));

      if (response?.success && response.data) {
        this.setTokens(response.data.accessToken, response.data.refreshToken, credentials.rememberMe);
        this.updateUser(response.data.user);
        this.updateAuthState(true);
      } else {
        const friendly = 'Correo o contraseña incorrectos';
        this.setError(friendly);
        throw new Error(friendly);
      }
    } catch (error: unknown) {
      const status: number | undefined = (error as ApiThrownError)?.status;
      const friendly = status && status >= 500
        ? 'Error del servidor. Inténtalo más tarde.'
        : 'Correo o contraseña incorrectos';
      this.setError(friendly);
      throw new Error(friendly); // Re-throw to let component handle it
    } finally {
      this.updateLoading(false);
    }
  }

  /**
   * Register new user
   * @param userData - Registration data
   */
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    this.updateLoading(true);
    this.clearError();

    try {
      const response = await firstValueFrom(this.api.post<RegisterResponse>(AUTH_ENDPOINTS.REGISTER, userData));

      if (response?.success && response.data) {
        // Registration successful, but no tokens provided
        // User needs to login separately
        return response.data;
      } else {
        this.setError(response?.error || 'Registration failed');
        throw new Error(response?.error || 'Registration failed');
      }
    } catch (error: unknown) {
      // Prefer specific validation feedback if available
      const apiError = error as ApiThrownError | undefined;
      let errorMessage = apiError?.message || 'Registration failed';
      const issues = apiError?.issues as ValidationIssue[] | undefined;

      if (Array.isArray(issues) && issues.length > 0) {
        // If the only issue is email invalid, show a friendly localized message
        const emailIssue = issues.find(i => Array.isArray(i?.path) && i.path.includes('email'));
        if (emailIssue && (emailIssue.validation === 'email' || emailIssue.code === 'invalid_string')) {
          errorMessage = 'Ingresa un email válido';
        } else {
          errorMessage = 'Hay errores en el formulario';
        }
      }

      this.setError(errorMessage);
      // Re-throw original error so the component can apply field-level errors
      throw new Error(errorMessage);
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
      await firstValueFrom(this.api.post<MessageResponse>(AUTH_ENDPOINTS.LOGOUT, {}, headers));
    } catch (error: unknown) {
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

      const response = await firstValueFrom(this.api.post<AuthResponse>(AUTH_ENDPOINTS.REFRESH_TOKEN, { refreshToken }));

      if (response?.success && response.data) {
        this.setTokens(response.data.accessToken, response.data.refreshToken);
        this.updateUser(response.data.user);
        this.updateAuthState(true);
        return true;
      }
      return false;
    } catch (error: unknown) {
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
      const response = await firstValueFrom(this.api.get<UserProfileDto>(USER_ENDPOINTS.PROFILE, undefined, headers));

      if (response?.success && response.data) {
        const mappedUser: User = {
          id: response.data.id,
          email: response.data.email,
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          name: `${response.data.firstName ?? ''} ${response.data.lastName ?? ''}`.trim() || response.data.email
        };
        this.updateUser(mappedUser);
      }
    } catch (error: unknown) {
      const apiError = error as ApiThrownError | undefined;
      this.setError(apiError?.message || 'Failed to load profile');
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
      const response = await firstValueFrom(this.api.post<MessageResponse>(AUTH_ENDPOINTS.RESET_PASSWORD, resetData));

      if (!response?.success) {
        this.setError(response?.error || 'Password reset failed');
      }
    } catch (error: unknown) {
      const apiError = error as ApiThrownError | undefined;
      this.setError(apiError?.message || 'Password reset failed');
    } finally {
      this.updateLoading(false);
    }
  }

  /**
   * Request password reset via email
   * @param email - User email address
   */
  async forgotPassword(email: string): Promise<void> {
    this.updateLoading(true);
    this.clearError();

    try {
      const requestData: ForgotPasswordRequest = { email };
      const response = await firstValueFrom(this.api.post<MessageResponse>(AUTH_ENDPOINTS.FORGOT_PASSWORD, requestData));

      if (!response?.success) {
        const apiError = response?.error as string | undefined;
        const isUserNotFound = apiError?.toLowerCase().includes('not found');
        // Treat "user not found" as success to avoid user enumeration
        if (!isUserNotFound) {
          this.setError(apiError || 'Failed to send reset email');
        }
      }
    } catch (error: unknown) {
      // If backend returns 404 for unknown email, treat as success
      const apiError = error as ApiThrownError | undefined;
      const status = apiError?.status;
      const message = apiError?.message?.toLowerCase();
      const isUserNotFound = message?.includes('not found');
      if (status !== 404 && !isUserNotFound) {
        this.setError(apiError?.message || 'Failed to send reset email');
      }
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

  public clearError(): void {
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
   * Store authentication tokens in appropriate storage based on rememberMe preference
   * @param accessToken - JWT access token
   * @param refreshToken - JWT refresh token
   * @param rememberMe - Whether to persist tokens across browser sessions
   */
  private setTokens(accessToken: string, refreshToken: string, rememberMe: boolean = false): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('auth_token', accessToken);
    storage.setItem('refresh_token', refreshToken);
  }

  /**
   * Get authentication token from storage (checks both sessionStorage and localStorage)
   */
  private getToken(): string | null {
    // First check sessionStorage, then localStorage
    return sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
  }

  /**
   * Get refresh token from storage (checks both sessionStorage and localStorage)
   */
  private getRefreshToken(): string | null {
    // First check sessionStorage, then localStorage
    return sessionStorage.getItem('refresh_token') || localStorage.getItem('refresh_token');
  }

  /**
   * Remove authentication tokens from both storage types
   */
  private removeToken(): void {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }

}
