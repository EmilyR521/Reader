import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ReadingListService } from '../../services/reading-list.service';
import { Book } from '../../models/book.model';
import { BookStatus } from '../../models/book-status.model';
import { BookRating } from '../../models/book-rating.model';

@Component({
  selector: 'app-book-details',
  templateUrl: './book-details.component.html',
  styleUrls: ['./book-details.component.css']
})
export class BookDetailsComponent implements OnInit, OnChanges {
  @Input() book: Book | null = null;
  @Input() isOpen: boolean = false;
  @Output() closed = new EventEmitter<void>();
  @Output() bookSaved = new EventEmitter<void>();
  @Output() bookDeleted = new EventEmitter<string>();

  isLoading = false;
  isEditMode = false;
  imageError = false;
  BookRating = BookRating;

  constructor(
    private readingListService: ReadingListService
  ) { }

  ngOnInit(): void {
    // Component initialized
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['book'] || changes['isOpen']) {
      if (this.isOpen && this.book) {
        this.isEditMode = false; // Start in view mode
        this.imageError = false; // Reset image error when book changes
      } else if (this.isOpen && !this.book) {
        // Adding new book
        this.isEditMode = true;
        this.imageError = false;
      } else if (!this.isOpen) {
        this.isEditMode = false;
        this.imageError = false;
      }
    }
  }

  close(): void {
    this.isOpen = false;
    this.isEditMode = false;
    this.closed.emit();
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
  }

  onFormSave(formData: Partial<Book>): void {
    if (this.book) {
      this.updateBook(formData);
    } else {
      this.addBook(formData);
    }
  }

  onFormCancel(): void {
    if (this.book) {
      this.toggleEditMode();
    } else {
      this.close();
    }
  }

  addBook(formData: Partial<Book>): void {
    if (formData.title?.trim() && formData.author?.trim()) {
      this.isLoading = true;
      const bookToAdd: Omit<Book, 'id' | 'addedDate'> = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        status: formData.status || BookStatus.ToRead,
        publishedDate: formData.publishedDate ? (formData.publishedDate instanceof Date ? formData.publishedDate.toISOString() : formData.publishedDate) : undefined,
        readingStartDate: formData.readingStartDate ? (formData.readingStartDate instanceof Date ? formData.readingStartDate.toISOString() : formData.readingStartDate) : undefined,
        readingEndDate: formData.readingEndDate ? (formData.readingEndDate instanceof Date ? formData.readingEndDate.toISOString() : formData.readingEndDate) : undefined,
        notes: formData.notes?.trim() || undefined,
        tags: formData.tags || [],
        imageUrl: formData.imageUrl?.trim() || undefined,
        rating: formData.rating || BookRating.None
      };

      this.readingListService.addBook(bookToAdd).subscribe({
        next: () => {
          this.isLoading = false;
          this.bookSaved.emit();
          this.close();
        },
        error: (error) => {
          console.error('Error adding book:', error);
          alert('Failed to add book. Please try again.');
          this.isLoading = false;
        }
      });
    }
  }

  updateBook(formData: Partial<Book>): void {
    if (this.book && formData.title?.trim() && formData.author?.trim()) {
      this.isLoading = true;
      const updates: Partial<Book> = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        status: formData.status || BookStatus.ToRead,
        publishedDate: formData.publishedDate ? (formData.publishedDate instanceof Date ? formData.publishedDate.toISOString() : formData.publishedDate) : undefined,
        readingStartDate: formData.readingStartDate ? (formData.readingStartDate instanceof Date ? formData.readingStartDate.toISOString() : formData.readingStartDate) : undefined,
        readingEndDate: formData.readingEndDate ? (formData.readingEndDate instanceof Date ? formData.readingEndDate.toISOString() : formData.readingEndDate) : undefined,
        notes: formData.notes?.trim() || undefined,
        tags: formData.tags || [],
        imageUrl: formData.imageUrl?.trim() || undefined,
        rating: formData.rating || BookRating.None
      };

      this.readingListService.updateBook(this.book.id, updates).subscribe({
        next: () => {
          this.isLoading = false;
          this.isEditMode = false;
          this.bookSaved.emit();
        },
        error: (error) => {
          console.error('Error updating book:', error);
          alert('Failed to update book. Please try again.');
          this.isLoading = false;
        }
      });
    }
  }

  deleteBook(): void {
    if (this.book && confirm('Are you sure you want to delete this book from your reading list?')) {
      const bookId = this.book.id;
      this.isLoading = true;
      this.readingListService.removeBook(bookId).subscribe({
        next: () => {
          this.isLoading = false;
          this.bookDeleted.emit(bookId);
          this.close();
        },
        error: (error) => {
          console.error('Error deleting book:', error);
          alert('Failed to delete book. Please try again.');
          this.isLoading = false;
        }
      });
    }
  }

  onImageError(event: Event): void {
    // Mark image as failed to show placeholder
    this.imageError = true;
  }
}
