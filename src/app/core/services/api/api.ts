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
    return this.http.get<any>(url, { params, headers }).pipe(
      map(response => this.transformResponse<T>(response))
    );
  }

  /**
   * POST request to API
   * @param endpoint - API endpoint path
   * @param body - Request body
   * @param headers - Custom headers
   */
  post<T>(endpoint: string, body: any, headers?: HttpHeaders): Observable<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.post<any>(url, body, { headers }).pipe(
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
  put<T>(endpoint: string, body: any, headers?: HttpHeaders): Observable<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.put<ApiResponse<T>>(url, body, { headers });
  }

  /**
   * DELETE request to API
   * @param endpoint - API endpoint path
   * @param headers - Custom headers
   */
  delete<T>(endpoint: string, headers?: HttpHeaders): Observable<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.delete<ApiResponse<T>>(url, { headers });
  }

  /**
   * PATCH request to API
   * @param endpoint - API endpoint path
   * @param body - Request body
   * @param headers - Custom headers
   */
  patch<T>(endpoint: string, body: any, headers?: HttpHeaders): Observable<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.patch<ApiResponse<T>>(url, body, { headers });
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
  private transformResponse<T>(response: any): ApiResponse<T> {
    // Handle different response formats
    if (response.statusCode && response.statusCode >= 400) {
      return {
        success: false,
        error: response.message || 'An error occurred',
        data: undefined
      };
    }

    // Handle successful responses
    if (response.data) {
      return {
        success: true,
        data: response.data,
        message: response.message
      };
    }

    // Handle direct data responses
    return {
      success: true,
      data: response,
      message: response.message
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
    const issues = (error as any)?.error?.error?.issues || (error as any)?.error?.issues;

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
