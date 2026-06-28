import { Component, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, SourceDoc } from './services/api.service';
import { HttpClient } from '@angular/common/http';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  sources?: SourceDoc[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  // Application State Signals
  backendConnected = signal<boolean>(false);
  backendChecking = signal<boolean>(true);
  uploading = signal<boolean>(false);
  uploadError = signal<string | null>(null);
  uploadSuccess = signal<string | null>(null);
  uploadedFiles = signal<string[]>([]);
  chatHistory = signal<ChatMessage[]>([]);
  queryLoading = signal<boolean>(false);
  // isAdminLoggedIn = signal<boolean>(false);

  // Form Inputs (using standard properties for clean [(ngModel)] binding)
  queryInput: string = '';
  isDragOver: boolean = false;
  isAdminLoggedIn: boolean = false;

  constructor(private apiService: ApiService,private http: HttpClient) {}

  ngOnInit() {
    this.checkBackendConnection();
    this.isAdminLoggedIn = !!localStorage.getItem('admin_token');
    // Automatically load existing documents from ChromaDB on page refresh
    this.loadIndexedDocuments();
  }

  // Listen for Ctrl + Shift + A anywhere on the page
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      this.promptAdminLogin();
    }
  }

  /**
   * Automatically synchronizes the sidebar array state with ChromaDB
   */
  loadIndexedDocuments() {
    this.apiService.getDocuments().subscribe({
      next: (res) => {
        if (res.success && res.documents) {
          // Update the signal with the list of files fetched from the backend
          this.uploadedFiles.set(res.documents);
        }
      },
      error: (err) => {
        console.error('Failed to restore indexed document sidebar list:', err);
      }
    });
  }

  promptAdminLogin() {
    const password = prompt('Enter Admin Password to Unlock Uploads:');
    if (!password) return;

    this.apiService.adminLogin(password).subscribe({
        next: (res) => {
          localStorage.setItem('admin_token', res.token);
          this.isAdminLoggedIn = true;
          alert('Admin access granted! Upload controls are now unlocked.');
        },
        error: (err) => {
          alert('Invalid password. Access denied.');
        }
      });
  }

  /**
   * Pings the backend health endpoint to check connection
   */
  checkBackendConnection() {
    this.backendChecking.set(true);
    this.apiService.checkHealth().subscribe({
      next: (res) => {
        this.backendConnected.set(res.status === 'OK');
        this.backendChecking.set(false);
      },
      error: () => {
        this.backendConnected.set(false);
        this.backendChecking.set(false);
      }
    });
  }

  /**
   * Triggers when user drops a file in drag & drop area
   */
  onFileDropped(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.uploadFile(event.dataTransfer.files[0]);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  /**
   * Triggers when user clicks the upload area and selects a file
   */
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFile(input.files[0]);
    }
  }

  /**
   * Handles file validation and upload pipeline
   */
  private uploadFile(file: File) {
    if (file.type !== 'application/pdf') {
      this.uploadError.set('Unsupported file format. Please upload a PDF file.');
      this.uploadSuccess.set(null);
      return;
    }

    this.uploading.set(true);
    this.uploadError.set(null);
    this.uploadSuccess.set(null);

    this.apiService.uploadPdf(file).subscribe({
      next: (res) => {
        this.uploading.set(false);
        if (res.success) {
          this.uploadSuccess.set(`Indexed successfully: ${file.name}`);
          const list = this.uploadedFiles();
          if (!list.includes(file.name)) {
            this.uploadedFiles.set([...list, file.name]);
          }

          // Append an automated notification in the chat
          this.chatHistory.update(history => [
            ...history,
            {
              sender: 'ai',
              text: `📄 Successfully processed "${file.name}". Extracted and split content into ${res.data?.chunksCount || 0} chunks, stored within local ChromaDB collection. Ask me anything about it!`,
              timestamp: new Date()
            }
          ]);
        } else {
          this.uploadError.set(res.message);
        }
      },
      error: (err) => {
        this.uploading.set(false);
        const errMsg = err.error?.message || 'Network error occurred while uploading. Ensure Express is running.';
        this.uploadError.set(errMsg);
      }
    });
  }

  /**
   * Transmits query text to backend and updates chat
   */
  sendQuery() {
    const query = this.queryInput.trim();
    if (!query) return;

    // Log user message
    const userMsg: ChatMessage = {
      sender: 'user',
      text: query,
      timestamp: new Date()
    };
    this.chatHistory.update(history => [...history, userMsg]);
    
    // Clear input bar and set loader
    this.queryInput = '';
    this.queryLoading.set(true);

    this.apiService.queryDocument(query).subscribe({
      next: (res) => {
        this.queryLoading.set(false);
        if (res.success) {
          const aiMsg: ChatMessage = {
            sender: 'ai',
            text: res.answer,
            timestamp: new Date(),
            sources: res.sources
          };
          this.chatHistory.update(history => [...history, aiMsg]);
        } else {
          this.chatHistory.update(history => [
            ...history,
            {
              sender: 'ai',
              text: 'Could not fetch a valid answer. Backend reported failure.',
              timestamp: new Date()
            }
          ]);
        }
      },
      error: (err) => {
        this.queryLoading.set(false);
        const errMsg = err.error?.message || 'Error communicating with RAG server. Make sure you uploaded a PDF first and ChromaDB is running.';
        this.chatHistory.update(history => [
          ...history,
          {
            sender: 'ai',
            text: `⚠️ Query Failed: ${errMsg}`,
            timestamp: new Date()
          }
        ]);
      }
    });
  }

  clearChat() {
    this.chatHistory.set([]);
  }
}
