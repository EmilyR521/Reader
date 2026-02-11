import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, HostListener, ViewChild } from '@angular/core';
import { ReadingListService } from '../../services/reading-list.service';
import { CollectionService } from '../../services/collection.service';
import { Book } from '../../models/book.model';
import { BookStatus } from '../../models/book-status.model';
import { BookRating } from '../../models/book-rating.model';
import { Collection } from '../../models/collection.model';
import { Subscription } from 'rxjs';
import { BookDetailsFormComponent } from './book-details-form/book-details-form.component';

@Component({
  selector: 'app-book-details',
  templateUrl: './book-details.component.html',
  styleUrls: ['./book-details.component.css']
})
export class BookDetailsComponent implements OnInit, OnDestroy, OnChanges {
  @Input() book: Book | null = null;
  @Input() isOpen: boolean = false;
  @Output() closed = new EventEmitter<void>();
  @Output() bookSaved = new EventEmitter<Book>();
  @Output() bookDeleted = new EventEmitter<string>();

  isLoading = false;
  isEditMode = false;
  imageError = false;
  BookRating = BookRating;
  
  // Collection functionality
  collections: Collection[] = [];
  showCollectionMenu = false;
  private collectionsSubscription?: Subscription;
  
  @ViewChild(BookDetailsFormComponent) formComponent?: BookDetailsFormComponent;

  constructor(
    private readingListService: ReadingListService,
    private collectionService: CollectionService
  ) { }

  ngOnInit(): void {
    // Load collections for "Add to collection" functionality
    this.collectionsSubscription = this.collectionService.collections$.subscribe(collections => {
      this.collections = collections;
    });
  }

  ngOnDestroy(): void {
    if (this.collectionsSubscription) {
      this.collectionsSubscription.unsubscribe();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close collection menu when clicking outside
    if (this.showCollectionMenu) {
      const target = event.target as HTMLElement;
      if (!target.closest('.collection-menu-wrapper')) {
        this.closeCollectionMenu();
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['book'] || changes['isOpen']) {
      if (this.isOpen && this.book) {
        this.isEditMode = false; // Start in view mode
        this.imageError = false; // Reset image error when book changes
        this.showCollectionMenu = false; // Close collection menu when book changes
      } else if (this.isOpen && !this.book) {
        // Adding new book
        this.isEditMode = true;
        this.imageError = false;
        this.showCollectionMenu = false;
      } else if (!this.isOpen) {
        this.isEditMode = false;
        this.imageError = false;
        this.showCollectionMenu = false; // Close collection menu when drawer closes
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
        next: (newBook) => {
          this.isLoading = false;
          // Clear the form
          if (this.formComponent) {
            this.formComponent.resetForm();
          }
          // Parse dates properly
          const parsedBook: Book = {
            ...newBook,
            addedDate: newBook.addedDate ? new Date(newBook.addedDate) : new Date(),
            publishedDate: newBook.publishedDate ? new Date(newBook.publishedDate) : undefined,
            readingStartDate: newBook.readingStartDate ? new Date(newBook.readingStartDate) : undefined,
            readingEndDate: newBook.readingEndDate ? new Date(newBook.readingEndDate) : undefined,
            imageUrl: newBook.imageUrl || undefined
          };
          this.bookSaved.emit(parsedBook);
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

  toggleCollectionMenu(): void {
    this.showCollectionMenu = !this.showCollectionMenu;
  }

  closeCollectionMenu(): void {
    this.showCollectionMenu = false;
  }

  addToCollection(collectionId: string): void {
    if (!this.book) {
      return;
    }

    this.collectionService.addBookToCollection(collectionId, this.book.id)
      .subscribe({
        next: () => {
          this.closeCollectionMenu();
        },
        error: (error) => {
          console.error('Error adding book to collection:', error);
          alert('Failed to add book to collection. Please try again.');
        }
      });
  }

  getAvailableCollections(): Collection[] {
    if (!this.book) {
      return this.collections;
    }
    // Filter out collections that already contain this book
    return this.collections.filter(collection => !collection.bookIds.includes(this.book!.id));
  }
}
