import { Component, OnInit, OnDestroy } from '@angular/core';
import { ViewType } from './components/toolbar/view-toolbar/view-toolbar.component';
import { Book } from './models/book.model';
import { UserService } from './services/user.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Reading List';
  showSettingsDrawer = false;
  currentView: ViewType = 'timeline';
  selectedBook: Book | null = null;
  isBookDetailsOpen = false;
  isAddingBook = false;
  private userSubscription?: Subscription;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    // Subscribe to current user changes to update title
    this.userSubscription = this.userService.currentUser$.subscribe(user => {
      this.updateTitle(user);
    });
    // Set initial title
    this.updateTitle(this.userService.getCurrentUser());
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

  toggleSettingsDrawer(): void {
    this.showSettingsDrawer = !this.showSettingsDrawer;
  }

  closeSettingsDrawer(): void {
    this.showSettingsDrawer = false;
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

  onBookSaved(): void {
    // Book saved, keep drawer open if editing, close if adding
    if (this.isAddingBook) {
      this.onBookDetailsClosed();
    }
  }

  onBookDeleted(id: string): void {
    this.onBookDetailsClosed();
  }
}
