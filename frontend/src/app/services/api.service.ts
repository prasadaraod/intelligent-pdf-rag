import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HealthResponse {
  status: string;
  message: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    filename: string;
    chunksCount: number;
    collectionName: string;
  };
}

export interface SourceDoc {
  text: string;
  metadata: {
    source: string;
    chunkIndex: number;
    uploadedAt: string;
  };
}

export interface QueryResponse {
  success: boolean;
  answer: string;
  sources: SourceDoc[];
}

export interface DocumentsResponse {
  success: boolean;
  documents: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Check connection status of the backend API
   */
  checkHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.baseUrl}/health`);
  }

  /**
   * Upload a PDF file to the backend
   */
  uploadPdf(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadResponse>(`${this.baseUrl}/api/upload`, formData);
  }

  /**
   * Fetches all unique indexed document filenames from ChromaDB
   */
  getDocuments(): Observable<DocumentsResponse> {
    return this.http.get<DocumentsResponse>(`${this.baseUrl}/api/documents`);
  }

  /**
   * Query the RAG system to retrieve answers and references
   */
  queryDocument(query: string): Observable<QueryResponse> {
    return this.http.post<QueryResponse>(`${this.baseUrl}/api/query`, { query });
  }

  /**
   * Authenticate admin credentials to unlock upload systems
   */
  adminLogin(password: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.baseUrl}/auth/login`, { password });
  }
}
