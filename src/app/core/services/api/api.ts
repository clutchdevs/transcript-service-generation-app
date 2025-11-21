import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

// Interface for API response structure
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  success: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class Api {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  /**
   * GET request to API
   * @param endpoint - API endpoint path
   * @param params - Query parameters
   * @param headers - Custom headers
   */
  get<T>(endpoint: string, params?: HttpParams, headers?: HttpHeaders): Observable<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.get<unknown>(url, { params, headers }).pipe(
      map(response => this.transformResponse<T>(response)),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * POST request to API
   * @param endpoint - API endpoint path
   * @param body - Request body
   * @param headers - Custom headers
   */
  post<T>(endpoint: string, body: unknown, headers?: HttpHeaders): Observable<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.post<unknown>(url, body, { headers }).pipe(
      map(response => this.transformResponse<T>(response)),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * PUT request to API
   * @param endpoint - API endpoint path
   * @param body - Request body
   * @param headers - Custom headers
   */
  put<T>(endpoint: string, body: unknown, headers?: HttpHeaders): Observable<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.put<unknown>(url, body, { headers }).pipe(
      map(response => this.transformResponse<T>(response)),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * DELETE request to API
   * @param endpoint - API endpoint path
   * @param headers - Custom headers
   */
  delete<T>(endpoint: string, headers?: HttpHeaders): Observable<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.delete<unknown>(url, { headers }).pipe(
      map(response => this.transformResponse<T>(response)),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * PATCH request to API
   * @param endpoint - API endpoint path
   * @param body - Request body
   * @param headers - Custom headers
   */
  patch<T>(endpoint: string, body: unknown, headers?: HttpHeaders): Observable<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.patch<unknown>(url, body, { headers }).pipe(
      map(response => this.transformResponse<T>(response)),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Create authorization header with Bearer token
   * @param token - JWT token
   */
  createAuthHeader(token: string): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Transform API response to standard format
   * @param response - Raw API response
   */
  private transformResponse<T>(response: unknown): ApiResponse<T> {
    // Type guard: Check if response is an object
    if (typeof response !== 'object' || response === null) {
      return {
        success: true,
        data: response as T,
        message: undefined
      };
    }

    const resp = response as Record<string, unknown>;

    // Handle error responses with statusCode
    if (typeof resp['statusCode'] === 'number' && resp['statusCode'] >= 400) {
      return {
        success: false,
        error: (typeof resp['message'] === 'string' ? resp['message'] : undefined) || 'An error occurred',
        data: undefined
      };
    }

    // Handle successful responses with data property
    if ('data' in resp) {
      return {
        success: true,
        data: resp['data'] as T,
        message: typeof resp['message'] === 'string' ? resp['message'] : undefined
      };
    }

    // Handle direct data responses (arrays, objects, etc.)
    return {
      success: true,
      data: response as T,
      message: typeof resp['message'] === 'string' ? resp['message'] : undefined
    };
  }

  /**
   * Handle HTTP errors
   * @param error - HTTP error response
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Server error: ${error.status} ${error.statusText}`;
      }
    }

    // Extract validation issues if present (e.g., ZodError format)
    const errorBody = error.error as { error?: { issues?: unknown }; issues?: unknown } | null;
    const issues = errorBody?.error?.issues || errorBody?.issues;

    // Throw a structured error object so callers can handle field-level issues
    return throwError(() => ({
      isApiError: true,
      message: errorMessage,
      status: error.status,
      issues,
      raw: error.error
    }));
  }
}
