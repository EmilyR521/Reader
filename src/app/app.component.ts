import { Component, OnInit, OnDestroy } from '@angular/core';
import { ViewType } from './components/toolbar/view-toolbar/view-toolbar.component';
import { Book } from './models/book.model';
import { UserService } from './services/user.service';
import { ThemeService } from './services/theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Reading List';
  currentView: ViewType = 'timeline';
  selectedBook: Book | null = null;
  isBookDetailsOpen = false;
  isAddingBook = false;
  private userSubscription?: Subscription;

  constructor(
    private userService: UserService,
    private themeService: ThemeService
  ) {
    // Initialize theme immediately in constructor to ensure it's applied before render
    // ThemeService constructor already calls loadTheme(), but we ensure it's instantiated here
  }

  ngOnInit(): void {
    // Ensure theme is applied (ThemeService should have already done this, but double-check)
    this.themeService.getTheme(); // This triggers theme application if not already done
    
    // Subscribe to current user changes to update title
    this.userSubscription = this.userService.currentUser$.subscribe(user => {
      this.updateTitle(user);
    });
    // Set initial title
    this.updateTitle(this.userService.getCurrentUser());

    // Register service worker for PWA (only in production)
    // Skip registration in development to allow hot reload
    if ('serviceWorker' in navigator && !this.isDevelopment()) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then((registration) => {
            console.log('ServiceWorker registration successful:', registration.scope);
          })
          .catch((error) => {
            console.log('ServiceWorker registration failed:', error);
          });
      });
    } else if ('serviceWorker' in navigator && this.isDevelopment()) {
      // Unregister any existing service workers in development
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
          console.log('ServiceWorker unregistered for development');
        });
      });
    }
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  updateTitle(username: string): void {
    if (username) {
      // Add possessive form (e.g., "Emily" -> "Emily's")
      const possessiveName = username.endsWith('s') ? `${username}'` : `${username}'s`;
      this.title = `${possessiveName} Reading List`;
    } else {
      this.title = 'Reading List';
    }
  }

  onViewChange(viewType: ViewType): void {
    this.currentView = viewType;
  }

  onAddBook(): void {
    this.selectedBook = null;
    this.isBookDetailsOpen = true;
    this.isAddingBook = true;
  }

  onViewBook(book: Book): void {
    this.selectedBook = book;
    this.isBookDetailsOpen = true;
    this.isAddingBook = false;
  }

  onBookDetailsClosed(): void {
    this.isBookDetailsOpen = false;
    this.selectedBook = null;
    this.isAddingBook = false;
  }

  onBookSaved(book: Book): void {
    // Book saved
    if (this.isAddingBook) {
      // When adding a new book, show it in the drawer and clear the form
      this.selectedBook = book;
      this.isAddingBook = false;
      // The book-details component will switch to view mode automatically
    }
    // If editing, the drawer stays open in view mode (handled by book-details component)
  }

  onBookDeleted(id: string): void {
    this.onBookDetailsClosed();
  }

  private isDevelopment(): boolean {
    // Check if we're running in development mode
    // Development: localhost or 127.0.0.1
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }
}
