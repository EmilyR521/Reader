import { Component } from '@angular/core';
import { ViewType } from './components/toolbar/view-toolbar/view-toolbar.component';
import { Book } from './models/book.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Reading List';
  showSettingsDrawer = false;
  currentView: ViewType = 'timeline';
  selectedBook: Book | null = null;
  isBookDetailsOpen = false;
  isAddingBook = false;

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
