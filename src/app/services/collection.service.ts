import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { Collection } from '../models/collection.model';
import { UserService } from './user.service';
import { ReadingListService } from './reading-list.service';

@Injectable({
  providedIn: 'root'
})
export class CollectionService {
  private readonly API_URL = '/api/collections';
  private collectionsSubject = new BehaviorSubject<Collection[]>([]);
  public collections$: Observable<Collection[]> = this.collectionsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private readingListService: ReadingListService
  ) {
    // Load collections from server on initialization
    this.loadCollections();
    
    // Reload collections when user changes
    this.userService.currentUser$.subscribe(() => {
      this.loadCollections();
    });
  }

  getCollections(): Collection[] {
    return this.collectionsSubject.value;
  }

  loadCollections(): void {
    const user = this.userService.getCurrentUser();
    const params = new HttpParams().set('user', user);
    
    this.http.get<Collection[]>(this.API_URL, { params })
      .pipe(
        tap(collections => {
          const parsedCollections = collections.map(collection => ({
            ...collection,
            createdDate: collection.createdDate ? new Date(collection.createdDate) : new Date()
          }));
          this.collectionsSubject.next(parsedCollections);
        }),
        catchError(error => {
          console.error('Error loading collections:', error);
          return throwError(() => error);
        })
      )
      .subscribe();
  }

  createCollection(name: string): Observable<Collection> {
    const user = this.userService.getCurrentUser();
    const params = new HttpParams().set('user', user);
    
    return this.http.post<Collection>(this.API_URL, { name }, { params })
      .pipe(
        tap(newCollection => {
          const collections = this.getCollections();
          const parsedCollection = {
            ...newCollection,
            createdDate: newCollection.createdDate ? new Date(newCollection.createdDate) : new Date()
          };
          collections.push(parsedCollection);
          this.collectionsSubject.next(collections);
        }),
        catchError(error => {
          console.error('Error creating collection:', error);
          return throwError(() => error);
        })
      );
  }

  updateCollection(id: string, updates: Partial<Collection>): Observable<Collection> {
    const user = this.userService.getCurrentUser();
    const params = new HttpParams().set('user', user);
    
    return this.http.put<Collection>(`${this.API_URL}/${id}`, updates, { params })
      .pipe(
        tap(updatedCollection => {
          const collections = this.getCollections();
          const index = collections.findIndex(c => c.id === id);
          if (index !== -1) {
            collections[index] = {
              ...updatedCollection,
              createdDate: updatedCollection.createdDate ? new Date(updatedCollection.createdDate) : new Date()
            };
            this.collectionsSubject.next(collections);
          }
        }),
        catchError(error => {
          console.error('Error updating collection:', error);
          return throwError(() => error);
        })
      );
  }

  deleteCollection(id: string): Observable<void> {
    const user = this.userService.getCurrentUser();
    const params = new HttpParams().set('user', user);
    
    return this.http.delete<void>(`${this.API_URL}/${id}`, { params })
      .pipe(
        tap(() => {
          const collections = this.getCollections().filter(c => c.id !== id);
          this.collectionsSubject.next(collections);
        }),
        catchError(error => {
          console.error('Error deleting collection:', error);
          return throwError(() => error);
        })
      );
  }

  addBookToCollection(collectionId: string, bookId: string): Observable<Collection> {
    const user = this.userService.getCurrentUser();
    const params = new HttpParams().set('user', user);
    
    return this.http.post<Collection>(`${this.API_URL}/${collectionId}/books`, { bookId }, { params })
      .pipe(
        tap(updatedCollection => {
          const collections = this.getCollections();
          const index = collections.findIndex(c => c.id === collectionId);
          if (index !== -1) {
            collections[index] = {
              ...updatedCollection,
              createdDate: updatedCollection.createdDate ? new Date(updatedCollection.createdDate) : new Date()
            };
            this.collectionsSubject.next(collections);
          }
        }),
        catchError(error => {
          console.error('Error adding book to collection:', error);
          return throwError(() => error);
        })
      );
  }

  removeBookFromCollection(collectionId: string, bookId: string): Observable<Collection> {
    const user = this.userService.getCurrentUser();
    const params = new HttpParams().set('user', user);
    
    return this.http.delete<Collection>(`${this.API_URL}/${collectionId}/books/${bookId}`, { params })
      .pipe(
        tap(updatedCollection => {
          const collections = this.getCollections();
          const index = collections.findIndex(c => c.id === collectionId);
          if (index !== -1) {
            collections[index] = {
              ...updatedCollection,
              createdDate: updatedCollection.createdDate ? new Date(updatedCollection.createdDate) : new Date()
            };
            this.collectionsSubject.next(collections);
          }
        }),
        catchError(error => {
          console.error('Error removing book from collection:', error);
          return throwError(() => error);
        })
      );
  }
}
