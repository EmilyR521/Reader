import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';

export interface User {
  username: string;
  icon: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly STORAGE_KEY = 'currentUser';
  private readonly DEFAULT_USER = 'Test';
  private readonly API_URL = '/api/users';
  private currentUserSubject = new BehaviorSubject<string>(this.getStoredUser());
  private allUsersSubject = new BehaviorSubject<User[]>([]);
  public currentUser$: Observable<string> = this.currentUserSubject.asObservable();
  public allUsers$: Observable<User[]> = this.allUsersSubject.asObservable();

  constructor(private http: HttpClient) {
    // If no user is stored, set default to 'Test'
    if (!this.getStoredUser()) {
      this.setCurrentUser(this.DEFAULT_USER);
    }
    // Load users from server
    this.loadUsers();
  }

  getCurrentUser(): string {
    return this.currentUserSubject.value;
  }

  setCurrentUser(user: string): void {
    if (user && user.trim()) {
      const trimmedUser = user.trim();
      localStorage.setItem(this.STORAGE_KEY, trimmedUser);
      this.currentUserSubject.next(trimmedUser);
    }
  }

  private getStoredUser(): string {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored || this.DEFAULT_USER;
  }

  loadUsers(): void {
    this.http.get<User[]>(this.API_URL)
      .pipe(
        tap(users => {
          this.allUsersSubject.next(users);
        }),
        catchError(error => {
          console.error('Error loading users:', error);
          // Fallback to default user if server fails
          this.allUsersSubject.next([{ username: this.DEFAULT_USER, icon: '📚' }]);
          return of([]);
        })
      )
      .subscribe();
  }

  getAllUsers(): User[] {
    return this.allUsersSubject.value;
  }

  createUser(username: string, icon: string): Observable<User> {
    return this.http.post<User>(this.API_URL, { username, icon });
  }
}
