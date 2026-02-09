import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ReadingListService } from './reading-list.service';

interface OpenLibrarySearchResponse {
  numFound: number;
  start: number;
  numFoundExact: boolean;
  docs: OpenLibraryBook[];
}

interface OpenLibraryBook {
  cover_i?: number;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  key: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class BookLookupService {
  private readonly OPEN_LIBRARY_API = 'https://openlibrary.org/search.json';
  private readonly COVER_BASE_URL = 'https://covers.openlibrary.org/b/id/';
  private readonly USER_AGENT = 'ReadingList/1.0 (e.rogers9131@gmail.com)';

  constructor(
    private http: HttpClient,
    private readingListService: ReadingListService
  ) { }

  /**
   * Search for a book cover image using Open Library API
   * @param title Book title
   * @param author Book author
   * @returns Observable<string | null> - Cover image URL or null if not found
   */
  lookupBookCover(title: string, author: string): Observable<string | null> {
    if (!title || !author) {
      return of(null);
    }

    // Build search query - search by both title and author for better results
    const query = `title:"${title}" AND author:"${author}"`;
    const url = `${this.OPEN_LIBRARY_API}?q=${encodeURIComponent(query)}&limit=5&fields=cover_i,title,author_name`;

    const headers = new HttpHeaders({
      'User-Agent': this.USER_AGENT
    });

    // Normalize title for exact matching (lowercase, trim)
    const normalizedTitle = title.toLowerCase().trim();

    return this.http.get<OpenLibrarySearchResponse>(url, { headers }).pipe(
      map(response => {
        if (response.docs && response.docs.length > 0) {
          // First, try to find an exact title match with a cover
          const exactMatch = response.docs.find(doc => {
            const docTitle = doc.title?.toLowerCase().trim();
            return docTitle === normalizedTitle && doc.cover_i;
          });

          if (exactMatch && exactMatch.cover_i) {
            // Construct cover URL: https://covers.openlibrary.org/b/id/{cover_i}-M.jpg
            // M = Medium size, can also use S (small), L (large)
            return `${this.COVER_BASE_URL}${exactMatch.cover_i}-M.jpg`;
          }

          // If no exact match with cover, try exact match without cover requirement
          const exactMatchNoCover = response.docs.find(doc => {
            const docTitle = doc.title?.toLowerCase().trim();
            return docTitle === normalizedTitle;
          });

          if (exactMatchNoCover && exactMatchNoCover.cover_i) {
            return `${this.COVER_BASE_URL}${exactMatchNoCover.cover_i}-M.jpg`;
          }

          // Fall back to first result with cover_i, or first result
          const book = response.docs.find(doc => doc.cover_i) || response.docs[0];
          
          if (book.cover_i) {
            return `${this.COVER_BASE_URL}${book.cover_i}-M.jpg`;
          }
        }
        return null;
      }),
      catchError(error => {
        console.error('Error looking up book cover:', error);
        return of(null);
      })
    );
  }

  /**
   * Lookup and save book cover image for a specific book
   * @param bookId Book ID to update
   * @param title Book title
   * @param author Book author
   * @returns Observable<string | null> - Cover image URL or null if not found
   */
  lookupAndSaveBookCover(bookId: string, title: string, author: string): Observable<string | null> {
    return this.lookupBookCover(title, author).pipe(
      map(imageUrl => {
        if (imageUrl) {
          // Update the book with the image URL
          this.readingListService.updateBook(bookId, { imageUrl }).subscribe({
            next: () => {
              console.log(`Cover image saved for book: ${title} by ${author}`);
            },
            error: (error) => {
              console.error('Error saving cover image:', error);
            }
          });
        }
        return imageUrl;
      })
    );
  }

  /**
   * Alternative search method using title only (fallback)
   * @param title Book title
   * @returns Observable<string | null> - Cover image URL or null if not found
   */
  lookupBookCoverByTitle(title: string): Observable<string | null> {
    if (!title) {
      return of(null);
    }

    const url = `${this.OPEN_LIBRARY_API}?title=${encodeURIComponent(title)}&limit=5&fields=cover_i,title,author_name`;

    const headers = new HttpHeaders({
      'User-Agent': this.USER_AGENT
    });

    return this.http.get<OpenLibrarySearchResponse>(url, { headers }).pipe(
      map(response => {
        if (response.docs && response.docs.length > 0) {
          const book = response.docs.find(doc => doc.cover_i) || response.docs[0];
          
          if (book.cover_i) {
            return `${this.COVER_BASE_URL}${book.cover_i}-M.jpg`;
          }
        }
        return null;
      }),
      catchError(error => {
        console.error('Error looking up book cover by title:', error);
        return of(null);
      })
    );
  }

  /**
   * Search for a book publication date using Open Library API
   * @param title Book title
   * @param author Book author
   * @returns Observable<string | null> - Publication date (YYYY-MM-DD format) or null if not found
   */
  lookupPublicationDate(title: string, author: string): Observable<string | null> {
    if (!title || !author) {
      return of(null);
    }

    // Build search query - search by both title and author for better results
    const query = `title:"${title}" AND author:"${author}"`;
    const url = `${this.OPEN_LIBRARY_API}?q=${encodeURIComponent(query)}&limit=5&fields=first_publish_year,title,author_name`;

    const headers = new HttpHeaders({
      'User-Agent': this.USER_AGENT
    });

    return this.http.get<OpenLibrarySearchResponse>(url, { headers }).pipe(
      map(response => {
        if (response.docs && response.docs.length > 0) {
          // Find the best match (first result usually has first_publish_year)
          const book = response.docs.find(doc => doc.first_publish_year) || response.docs[0];
          
          if (book.first_publish_year) {
            // Return date in YYYY-MM-DD format (using January 1st as default)
            return `${book.first_publish_year}-01-01`;
          }
        }
        return null;
      }),
      catchError(error => {
        console.error('Error looking up publication date:', error);
        return of(null);
      })
    );
  }

  /**
   * Lookup and save publication date for a specific book
   * @param bookId Book ID to update
   * @param title Book title
   * @param author Book author
   * @returns Observable<string | null> - Publication date or null if not found
   */
  lookupAndSavePublicationDate(bookId: string, title: string, author: string): Observable<string | null> {
    return this.lookupPublicationDate(title, author).pipe(
      map(publicationDate => {
        if (publicationDate) {
          // Update the book with the publication date
          this.readingListService.updateBook(bookId, { publishedDate: publicationDate }).subscribe({
            next: () => {
              console.log(`Publication date saved for book: ${title} by ${author}`);
            },
            error: (error) => {
              console.error('Error saving publication date:', error);
            }
          });
        }
        return publicationDate;
      })
    );
  }
}
