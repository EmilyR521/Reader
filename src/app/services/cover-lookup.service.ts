import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BookLookupService } from './book-lookup.service';
import { ReadingListService } from './reading-list.service';
import { Book } from '../models/book.model';

export interface BulkLookupResult {
  total: number;
  found: number;
  completed: number;
}

export interface LookupOptions {
  covers: boolean;
  publicationDates: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CoverLookupService {
  constructor(
    private bookLookupService: BookLookupService,
    private readingListService: ReadingListService
  ) {}

  /**
   * Lookup cover images for all books without covers
   * @returns Observable that emits progress updates and final result
   */
  lookupAllCovers(): Observable<BulkLookupResult> {
    const books = this.readingListService.getBooks();
    const booksWithoutCovers = books.filter(book => !book.imageUrl);

    if (booksWithoutCovers.length === 0) {
      return of({ total: 0, found: 0, completed: 0 });
    }

    // Create observables for each book lookup with delay
    const lookups = booksWithoutCovers.map((book, index) => {
      return new Observable<{ bookId: string; imageUrl: string | null }>(observer => {
        setTimeout(() => {
          this.bookLookupService
            .lookupAndSaveBookCover(book.id, book.title, book.author)
            .subscribe({
              next: (imageUrl) => {
                observer.next({ bookId: book.id, imageUrl });
                observer.complete();
              },
              error: (error) => {
                console.error(`Error looking up cover for ${book.title}:`, error);
                observer.next({ bookId: book.id, imageUrl: null });
                observer.complete();
              }
            });
        }, index * 500); // 500ms delay between requests
      });
    });

    // Execute all lookups and collect results
    return forkJoin(lookups).pipe(
      map(results => {
        const found = results.filter(r => r.imageUrl !== null).length;
        return {
          total: booksWithoutCovers.length,
          found,
          completed: results.length
        };
      }),
      catchError(error => {
        console.error('Error during bulk cover lookup:', error);
        return of({ total: booksWithoutCovers.length, found: 0, completed: 0 });
      })
    );
  }

  /**
   * Lookup data for books based on selected options
   * @param options Lookup options (covers, publicationDates)
   * @returns Observable with combined results
   */
  lookupData(options: LookupOptions): Observable<{ covers: BulkLookupResult; publicationDates: BulkLookupResult }> {
    const books = this.readingListService.getBooks();
    const results = {
      covers: { total: 0, found: 0, completed: 0 },
      publicationDates: { total: 0, found: 0, completed: 0 }
    };

    const observables: Observable<any>[] = [];
    let delayOffset = 0;

    if (options.covers) {
      const booksWithoutCovers = books.filter(book => !book.imageUrl);
      if (booksWithoutCovers.length > 0) {
        results.covers.total = booksWithoutCovers.length;
        const coverLookups = booksWithoutCovers.map((book, index) => {
          return new Observable<{ bookId: string; imageUrl: string | null }>(observer => {
            setTimeout(() => {
              this.bookLookupService
                .lookupAndSaveBookCover(book.id, book.title, book.author)
                .subscribe({
                  next: (imageUrl) => {
                    observer.next({ bookId: book.id, imageUrl });
                    observer.complete();
                  },
                  error: (error) => {
                    console.error(`Error looking up cover for ${book.title}:`, error);
                    observer.next({ bookId: book.id, imageUrl: null });
                    observer.complete();
                  }
                });
            }, (delayOffset + index) * 500);
          });
        });
        delayOffset += booksWithoutCovers.length;
        observables.push(
          forkJoin(coverLookups).pipe(
            map((coverResults: any[]) => {
              const found = coverResults.filter(r => r.imageUrl !== null).length;
              results.covers = {
                total: booksWithoutCovers.length,
                found,
                completed: coverResults.length
              };
              return 'covers';
            })
          )
        );
      }
    }

    if (options.publicationDates) {
      const booksWithoutDates = books.filter(book => !book.publishedDate);
      if (booksWithoutDates.length > 0) {
        results.publicationDates.total = booksWithoutDates.length;
        const dateLookups = booksWithoutDates.map((book, index) => {
          return new Observable<{ bookId: string; publicationDate: string | null }>(observer => {
            setTimeout(() => {
              this.bookLookupService
                .lookupAndSavePublicationDate(book.id, book.title, book.author)
                .subscribe({
                  next: (publicationDate) => {
                    observer.next({ bookId: book.id, publicationDate });
                    observer.complete();
                  },
                  error: (error) => {
                    console.error(`Error looking up publication date for ${book.title}:`, error);
                    observer.next({ bookId: book.id, publicationDate: null });
                    observer.complete();
                  }
                });
            }, (delayOffset + index) * 500);
          });
        });
        observables.push(
          forkJoin(dateLookups).pipe(
            map((dateResults: any[]) => {
              const found = dateResults.filter(r => r.publicationDate !== null).length;
              results.publicationDates = {
                total: booksWithoutDates.length,
                found,
                completed: dateResults.length
              };
              return 'dates';
            })
          )
        );
      }
    }

    if (observables.length === 0) {
      return of(results);
    }

    return forkJoin(observables).pipe(
      map(() => results),
      catchError(error => {
        console.error('Error during bulk data lookup:', error);
        return of(results);
      })
    );
  }
}
