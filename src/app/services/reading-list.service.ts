import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { Book } from '../models/book.model';
import { BookStatus } from '../models/book-status.model';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class ReadingListService {
  private readonly API_URL = '/api/books';
  private booksSubject = new BehaviorSubject<Book[]>([]);
  public books$: Observable<Book[]> = this.booksSubject.asObservable();

  constructor(
    private http: HttpClient,
    private userService: UserService
  ) {
    // Load books from server on initialization
    this.loadBooks();
    
    // Reload books when user changes
    this.userService.currentUser$.subscribe(() => {
      this.loadBooks();
    });
  }

  getBooks(): Book[] {
    return this.booksSubject.value;
  }

  loadBooks(): void {
    const user = this.userService.getCurrentUser();
    const params = new HttpParams().set('user', user);
    
    this.http.get<Book[]>(this.API_URL, { params })
      .pipe(
        tap(books => {
          const parsedBooks = books.map(book => ({
            ...book,
            addedDate: book.addedDate ? new Date(book.addedDate) : new Date(),
            publishedDate: book.publishedDate ? new Date(book.publishedDate) : undefined,
            readingStartDate: book.readingStartDate ? new Date(book.readingStartDate) : undefined,
            readingEndDate: book.readingEndDate ? new Date(book.readingEndDate) : undefined
          }));
          this.booksSubject.next(parsedBooks);
        }),
        catchError(error => {
          console.error('Error loading books:', error);
          return throwError(() => error);
        })
      )
      .subscribe();
  }

  addBook(book: Omit<Book, 'id' | 'addedDate'>): Observable<Book> {
    const user = this.userService.getCurrentUser();
    const params = new HttpParams().set('user', user);
    
    return this.http.post<Book>(this.API_URL, book, { params })
      .pipe(
        tap(newBook => {
          const books = this.getBooks();
          const parsedBook = {
            ...newBook,
            addedDate: newBook.addedDate ? new Date(newBook.addedDate) : new Date(),
            publishedDate: newBook.publishedDate ? new Date(newBook.publishedDate) : undefined,
            readingStartDate: newBook.readingStartDate ? new Date(newBook.readingStartDate) : undefined,
            readingEndDate: newBook.readingEndDate ? new Date(newBook.readingEndDate) : undefined,
            imageUrl: newBook.imageUrl || undefined
          };
          books.push(parsedBook);
          this.booksSubject.next(books);
        }),
        catchError(error => {
          console.error('Error adding book:', error);
          return throwError(() => error);
        })
      );
  }

  removeBook(id: string): Observable<void> {
    const user = this.userService.getCurrentUser();
    const params = new HttpParams().set('user', user);
    
    return this.http.delete<void>(`${this.API_URL}/${id}`, { params })
      .pipe(
        tap(() => {
          const books = this.getBooks().filter(book => book.id !== id);
          this.booksSubject.next(books);
        }),
        catchError(error => {
          console.error('Error removing book:', error);
          return throwError(() => error);
        })
      );
  }

  updateBook(id: string, updates: Partial<Book>): Observable<Book> {
    const user = this.userService.getCurrentUser();
    const params = new HttpParams().set('user', user);
    
    return this.http.put<Book>(`${this.API_URL}/${id}`, updates, { params })
      .pipe(
        tap(updatedBook => {
          const books = this.getBooks();
          const index = books.findIndex(book => book.id === id);
          if (index !== -1) {
            books[index] = {
              ...updatedBook,
              addedDate: updatedBook.addedDate ? new Date(updatedBook.addedDate) : new Date(),
              publishedDate: updatedBook.publishedDate ? new Date(updatedBook.publishedDate) : undefined,
              readingStartDate: updatedBook.readingStartDate ? new Date(updatedBook.readingStartDate) : undefined,
              readingEndDate: updatedBook.readingEndDate ? new Date(updatedBook.readingEndDate) : undefined,
              imageUrl: updatedBook.imageUrl || undefined
            };
            this.booksSubject.next(books);
          }
        }),
        catchError(error => {
          console.error('Error updating book:', error);
          return throwError(() => error);
        })
      );
  }

  getStatusOptions(): BookStatus[] {
    return Object.values(BookStatus);
  }
}
