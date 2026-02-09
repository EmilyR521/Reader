import { Injectable } from '@angular/core';
    import { Observable } from 'rxjs';
    import { Book } from '../models/book.model';
    import { BookStatus } from '../models/book-status.model';
    import { ImportResult } from '../models/import-result.model';

@Injectable({
  providedIn: 'root'
})
export class CsvImportExportService {
  private readonly CSV_HEADERS = [
    'Title',
    'Author',
    'Status',
    'Published Date',
    'Reading Start Date',
    'Reading End Date',
    'Notes',
    'Tags'
  ];

  /**
   * Export books to CSV file
   * @param books Array of books to export
   * @param includeData If false, exports only headers (template)
   * @param filename Optional custom filename
   */
  exportToCSV(books: Book[], includeData: boolean = true, filename?: string): void {
    const csvContent = this.buildCSVContent(books, includeData);
    this.downloadCSV(csvContent, filename || (includeData ? 'reading-list.csv' : 'reading-list-template.csv'));
  }

  /**
   * Import books from CSV file
   * @param file CSV file to import
   * @param addBookCallback Callback function to add each book
   * @param existingBooks Optional array of existing books to check for duplicates
   * @returns Observable with import results and progress updates
   */
  importFromCSV(
    file: File,
    addBookCallback: (book: Omit<Book, 'id' | 'addedDate'>) => Observable<Book>,
    existingBooks: Book[] = []
  ): Observable<ImportResult> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        try {
          const csv = e.target.result as string;
          const result = this.processCSVImport(csv, addBookCallback, existingBooks);
          result.subscribe({
            next: (importResult) => {
              observer.next(importResult);
              observer.complete();
            },
            error: (error) => {
              observer.error(error);
            }
          });
        } catch (error: any) {
          observer.error(new Error(`Failed to process CSV: ${error.message}`));
        }
      };

      reader.onerror = () => {
        observer.error(new Error('Failed to read CSV file'));
      };

      reader.readAsText(file, 'UTF-8');
    });
  }

  // ============================================================================
  // CSV BUILDING METHODS
  // ============================================================================

  /**
   * Build CSV content from books array
   */
  private buildCSVContent(books: Book[], includeData: boolean): string {
    let csvContent = this.CSV_HEADERS.join(',') + '\n';

    if (includeData) {
      books.forEach(book => {
        csvContent += this.buildCSVRow(book) + '\n';
      });
    }

    return csvContent;
  }

  /**
   * Build a single CSV row from a book
   */
  private buildCSVRow(book: Book): string {
    const row = [
      this.escapeCSV(book.title),
      this.escapeCSV(book.author),
      this.escapeCSV(book.status),
      this.formatDateForCSV(book.publishedDate),
      this.formatDateForCSV(book.readingStartDate),
      this.formatDateForCSV(book.readingEndDate),
      this.escapeCSV(book.notes || ''),
      this.escapeCSV(book.tags ? book.tags.join(';') : '')
    ];
    return row.join(',');
  }

  /**
   * Download CSV file to user's computer
   */
  private downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  // ============================================================================
  // CSV PARSING METHODS
  // ============================================================================

  /**
   * Process CSV import and add books
   */
  private processCSVImport(
    csv: string,
    addBookCallback: (book: Omit<Book, 'id' | 'addedDate'>) => Observable<Book>,
    existingBooks: Book[] = []
  ): Observable<ImportResult> {
    return new Observable(observer => {
      const lines = this.splitCSVLines(csv);
      
      if (lines.length < 2) {
        observer.error(new Error('CSV file must have at least a header row and one data row'));
        return;
      }

      // Validate and map headers
      const headerValidation = this.validateHeaders(lines[0]);
      if (!headerValidation.valid || !headerValidation.headerMap) {
        observer.error(new Error(headerValidation.error || 'Invalid headers'));
        return;
      }

      const headerMap = headerValidation.headerMap;
      const errors: string[] = [];
      let successCount = 0;
      const booksToAdd: Omit<Book, 'id' | 'addedDate'>[] = [];
      
      // Create a set of existing book keys for quick lookup
      const existingBookKeys = new Set(
        existingBooks.map(book => 
          (book.title || '').toLowerCase().trim() + '|' + (book.author || '').toLowerCase().trim()
        )
      );

      // Parse all rows first
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          continue;
        }

        try {
          const book = this.parseBookFromRow(line, headerMap, i + 1);
          if (book) {
            // Check if book already exists
            const bookKey = (book.title || '').toLowerCase().trim() + '|' + (book.author || '').toLowerCase().trim();
            if (existingBookKeys.has(bookKey)) {
              errors.push(`Row ${i + 1}: Book "${book.title}" by ${book.author} already exists and was skipped`);
            } else {
              booksToAdd.push(book);
              // Add to existing set to prevent duplicates within the CSV itself
              existingBookKeys.add(bookKey);
            }
          }
        } catch (error: any) {
          const errorMsg = `Row ${i + 1}: ${error.message || 'Invalid data'}`;
          errors.push(errorMsg);
        }
      }

      // Add all books
      if (booksToAdd.length > 0) {
        this.addBooksSequentially(booksToAdd, addBookCallback, errors)
          .subscribe({
            next: (result) => {
              observer.next(result);
              observer.complete();
            },
            error: (error) => {
              observer.error(error);
            }
          });
      } else {
        observer.next({ success: 0, errors });
        observer.complete();
      }
    });
  }

  /**
   * Split CSV into lines, handling different line endings
   */
  private splitCSVLines(csv: string): string[] {
    return csv.split(/\r?\n/).filter((line: string) => line.trim().length > 0);
  }

  /**
   * Validate CSV headers and create mapping
   */
  private validateHeaders(headerLine: string): { valid: boolean; headerMap?: { [key: string]: string }; error?: string } {
    const headers = this.parseCSVLine(headerLine).map(h => h.trim());
    const headerMap: { [key: string]: string } = {};

    // Create case-insensitive mapping
    headers.forEach(h => {
      const matched = this.CSV_HEADERS.find(eh => eh.toLowerCase() === h.toLowerCase());
      if (matched) {
        headerMap[h] = matched;
      }
    });

    // Check for missing required headers (Title and Author are required)
    const requiredHeaders = ['Title', 'Author'];
    const missingRequired = requiredHeaders.filter(h => !Object.values(headerMap).includes(h));
    if (missingRequired.length > 0) {
      return {
        valid: false,
        error: `Missing required headers: ${missingRequired.join(', ')}`
      };
    }

    return { valid: true, headerMap };
  }

  /**
   * Parse a single CSV row into a Book object
   */
  private parseBookFromRow(
    line: string,
    headerMap: { [key: string]: string },
    rowNumber: number
  ): Omit<Book, 'id' | 'addedDate'> | null {
    const values = this.parseCSVLine(line);
    const headers = Object.keys(headerMap);

    // Pad values if row has fewer columns
    while (values.length < headers.length) {
      values.push('');
    }

    // Map values to headers
    const bookData: any = {};
    headers.forEach((header, index) => {
      const normalizedHeader = headerMap[header] || header;
      bookData[normalizedHeader] = (values[index] || '').trim();
    });

    // Validate required fields
    const title = bookData['Title']?.trim();
    const author = bookData['Author']?.trim();

    if (!title || !author) {
      throw new Error(`Title and Author are required (found: Title="${title}", Author="${author}")`);
    }

    // Parse book data
    const status = this.validateStatus(bookData['Status']) || BookStatus.ToRead;
    const tags = this.parseTags(bookData['Tags']);

    return {
      title: title,
      author: author,
      status: status,
      publishedDate: this.parseDate(bookData['Published Date']),
      readingStartDate: this.parseDate(bookData['Reading Start Date']),
      readingEndDate: this.parseDate(bookData['Reading End Date']),
      notes: bookData['Notes'] || undefined,
      tags: tags.length > 0 ? tags : undefined
    };
  }

  /**
   * Add books sequentially using the callback
   */
  private addBooksSequentially(
    books: Omit<Book, 'id' | 'addedDate'>[],
    addBookCallback: (book: Omit<Book, 'id' | 'addedDate'>) => Observable<Book>,
    errors: string[]
  ): Observable<{ success: number; errors: string[] }> {
    return new Observable(observer => {
      let successCount = 0;
      let completed = 0;
      const total = books.length;

      if (books.length === 0) {
        observer.next({ success: 0, errors });
        observer.complete();
        return;
      }

      const processNext = (index: number) => {
        if (index >= books.length) {
          observer.next({ success: successCount, errors });
          observer.complete();
          return;
        }

        const book = books[index];
        
        // Add a small delay to avoid overwhelming the server (50ms between requests)
        const delay = index > 0 ? 50 : 0;
        
        setTimeout(() => {
          addBookCallback(book).subscribe({
            next: () => {
              successCount++;
              completed++;
              processNext(index + 1);
            },
            error: (error) => {
              const errorMessage = `Row ${index + 1}: Failed to add "${book.title}" - ${error.message || 'Unknown error'}`;
              console.error(`Import error for book "${book.title}":`, error);
              errors.push(errorMessage);
              completed++;
              // Continue processing even on error
              processNext(index + 1);
            }
          });
        }, delay);
      };

      processNext(0);
    });
  }

  // ============================================================================
  // CSV UTILITY METHODS
  // ============================================================================

  /**
   * Parse a CSV line handling quoted fields and escaped quotes
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    // Add the last field
    result.push(current);

    // Trim all fields
    return result.map(field => field.trim());
  }

  /**
   * Escape CSV value if it contains special characters
   */
  private escapeCSV(value: string): string {
    if (!value) return '';
    
    // If value contains comma, newline, or quote, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    
    return value;
  }

  /**
   * Parse tags from semicolon-separated string
   */
  private parseTags(tagsString: string | undefined): string[] {
    if (!tagsString) return [];
    return tagsString
      .split(';')
      .map(t => t.trim())
      .filter(t => t.length > 0);
  }

  // ============================================================================
  // DATE PARSING METHODS
  // ============================================================================

  /**
   * Format date for CSV export (YYYY-MM-DD)
   */
  private formatDateForCSV(date: Date | string | undefined): string {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    
    return dateObj.toISOString().split('T')[0];
  }

  /**
   * Parse date string from CSV (handles multiple formats)
   */
  private parseDate(dateString: string): string | undefined {
    if (!dateString || !dateString.trim()) return undefined;

    const trimmed = dateString.trim();

    // Format 1: DD/MM/YYYY or D/M/YYYY
    const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1; // Month is 0-indexed
      const year = parseInt(ddmmyyyy[3], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime()) && date.getDate() === day && date.getMonth() === month) {
        return date.toISOString();
      }
    }

    // Format 2: YYYY-MM-DD (ISO format)
    const yyyymmdd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1], 10);
      const month = parseInt(yyyymmdd[2], 10) - 1;
      const day = parseInt(yyyymmdd[3], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // Format 3: MM/DD/YYYY (US format)
    const mmddyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyy) {
      const month = parseInt(mmddyyyy[1], 10) - 1;
      const day = parseInt(mmddyyyy[2], 10);
      const year = parseInt(mmddyyyy[3], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime()) && date.getMonth() === month) {
        return date.toISOString();
      }
    }

    // Fallback: Try standard Date parsing
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    return undefined;
  }

  // ============================================================================
  // STATUS VALIDATION METHODS
  // ============================================================================

  /**
   * Validate and normalize book status
   */
  private validateStatus(status: string): BookStatus | null {
    if (!status) return null;

    const validStatuses = Object.values(BookStatus);
    const normalizedStatus = status.toLowerCase().trim();

    // Direct match
    const directMatch = validStatuses.find(s => s.toLowerCase() === normalizedStatus);
    if (directMatch) return directMatch;

    // Handle common variations
    const statusMap: { [key: string]: BookStatus } = {
      'to read': BookStatus.ToRead,
      'toread': BookStatus.ToRead,
      'want to read': BookStatus.ToRead,
      'reading': BookStatus.Reading,
      'currently reading': BookStatus.Reading,
      'finished': BookStatus.Finished,
      'read': BookStatus.Finished,
      'completed': BookStatus.Finished,
      'done': BookStatus.Finished,
      'on hold': BookStatus.OnHold,
      'onhold': BookStatus.OnHold,
      'paused': BookStatus.OnHold,
      'abandoned': BookStatus.Abandoned,
      'dropped': BookStatus.Abandoned,
      'did not finish': BookStatus.Abandoned,
      'dnf': BookStatus.Abandoned
    };

    return statusMap[normalizedStatus] || null;
  }
}
