import { Component, OnInit, OnDestroy, Output, EventEmitter, HostListener } from '@angular/core';
import { CollectionService } from '../../../services/collection.service';
import { ReadingListService } from '../../../services/reading-list.service';
import { Collection } from '../../../models/collection.model';
import { Book } from '../../../models/book.model';
import { BookStatus } from '../../../models/book-status.model';
import { Subscription, combineLatest } from 'rxjs';

@Component({
  selector: 'app-collections-view',
  templateUrl: './collections-view.component.html',
  styleUrls: ['./collections-view.component.css']
})
export class CollectionsViewComponent implements OnInit, OnDestroy {
  collections: Collection[] = [];
  books: Book[] = [];
  collectionsWithBooks: Array<Collection & { books: Book[] }> = [];
  
  showCreateModal = false;
  newCollectionName = '';
  editingCollectionId: string | null = null;
  editingCollectionName = '';
  
  // Book search state per collection
  bookSearchTerms: { [collectionId: string]: string } = {};
  showBookDropdown: { [collectionId: string]: boolean } = {};
  
  // Context menu state
  contextMenuVisible = false;
  contextMenuX = 0;
  contextMenuY = 0;
  selectedBookForMenu: Book | null = null;
  
  @Output() viewBook = new EventEmitter<Book>();
  
  BookStatus = BookStatus;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private collectionService: CollectionService,
    private readingListService: ReadingListService
  ) {}

  ngOnInit(): void {
    // Combine collections and books to create collectionsWithBooks
    const combinedSubscription = combineLatest([
      this.collectionService.collections$,
      this.readingListService.books$
    ]).subscribe(([collections, books]) => {
      this.collections = collections;
      this.books = books;
      
      // Map collections with their books
      this.collectionsWithBooks = collections.map(collection => ({
        ...collection,
        books: collection.bookIds
          .map(bookId => books.find(book => book.id === bookId))
          .filter((book): book is Book => book !== undefined)
      }));
    });
    
    this.subscriptions.push(combinedSubscription);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close all book search dropdowns when clicking outside
    const target = event.target as HTMLElement;
    if (!target.closest('.book-search-wrapper')) {
      Object.keys(this.showBookDropdown).forEach(collectionId => {
        this.showBookDropdown[collectionId] = false;
      });
    }
    // Close context menu when clicking outside
    if (this.contextMenuVisible && !target.closest('.context-menu')) {
      this.closeContextMenu();
    }
  }

  @HostListener('document:contextmenu', ['$event'])
  onDocumentRightClick(event: MouseEvent): void {
    // Close context menu when right-clicking elsewhere
    if (this.contextMenuVisible) {
      this.closeContextMenu();
    }
  }

  openCreateModal(): void {
    this.newCollectionName = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.newCollectionName = '';
  }

  createCollection(): void {
    if (!this.newCollectionName.trim()) {
      return;
    }

    this.collectionService.createCollection(this.newCollectionName.trim())
      .subscribe({
        next: () => {
          this.closeCreateModal();
        },
        error: (error) => {
          console.error('Error creating collection:', error);
        }
      });
  }

  startEditing(collection: Collection): void {
    this.editingCollectionId = collection.id;
    this.editingCollectionName = collection.name;
  }

  cancelEditing(): void {
    this.editingCollectionId = null;
    this.editingCollectionName = '';
  }

  saveCollection(collectionId: string): void {
    if (!this.editingCollectionName.trim()) {
      return;
    }

    this.collectionService.updateCollection(collectionId, { name: this.editingCollectionName.trim() })
      .subscribe({
        next: () => {
          this.cancelEditing();
        },
        error: (error) => {
          console.error('Error updating collection:', error);
        }
      });
  }

  deleteCollection(collectionId: string): void {
    if (confirm('Are you sure you want to delete this collection?')) {
      this.collectionService.deleteCollection(collectionId)
        .subscribe({
          error: (error) => {
            console.error('Error deleting collection:', error);
          }
        });
    }
  }

  addBookToCollection(collectionId: string, bookId: string): void {
    this.collectionService.addBookToCollection(collectionId, bookId)
      .subscribe({
        error: (error) => {
          console.error('Error adding book to collection:', error);
        }
      });
  }

  removeBookFromCollection(collectionId: string, bookId: string): void {
    this.collectionService.removeBookFromCollection(collectionId, bookId)
      .subscribe({
        error: (error) => {
          console.error('Error removing book from collection:', error);
        }
      });
  }

  onViewBook(book: Book): void {
    this.viewBook.emit(book);
  }

  getAvailableBooks(collection: Collection): Book[] {
    return this.books.filter(book => !collection.bookIds.includes(book.id));
  }

  getFilteredBooks(collection: Collection): Book[] {
    const availableBooks = this.getAvailableBooks(collection);
    const searchTerm = (this.bookSearchTerms[collection.id] || '').toLowerCase().trim();
    
    if (!searchTerm) {
      return availableBooks;
    }
    
    return availableBooks.filter(book => {
      const titleMatch = book.title?.toLowerCase().includes(searchTerm);
      const authorMatch = book.author?.toLowerCase().includes(searchTerm);
      return titleMatch || authorMatch;
    });
  }

  onBookSearchInput(collectionId: string, value: string): void {
    this.bookSearchTerms[collectionId] = value;
    this.showBookDropdown[collectionId] = value.trim().length > 0;
  }

  onBookSearchFocus(collectionId: string): void {
    const searchTerm = this.bookSearchTerms[collectionId] || '';
    if (searchTerm.trim().length > 0) {
      this.showBookDropdown[collectionId] = true;
    }
  }

  onBookSearchBlur(collectionId: string): void {
    // Delay closing to allow click on dropdown item
    setTimeout(() => {
      this.showBookDropdown[collectionId] = false;
    }, 200);
  }

  selectBook(collectionId: string, bookId: string): void {
    this.addBookToCollection(collectionId, bookId);
    this.bookSearchTerms[collectionId] = '';
    this.showBookDropdown[collectionId] = false;
  }

  clearBookSearch(collectionId: string): void {
    this.bookSearchTerms[collectionId] = '';
    this.showBookDropdown[collectionId] = false;
  }

  onBookRightClick(event: MouseEvent, book: Book): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.selectedBookForMenu = book;
    
    // Position context menu, ensuring it stays within viewport
    const menuWidth = 200;
    const menuHeight = 100;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Adjust X position if menu would go off right edge
    let x = event.clientX;
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }
    
    // Adjust Y position if menu would go off bottom edge
    let y = event.clientY;
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }
    
    this.contextMenuX = x;
    this.contextMenuY = y;
    this.contextMenuVisible = true;
  }

  closeContextMenu(): void {
    this.contextMenuVisible = false;
    this.selectedBookForMenu = null;
  }

  findOnWoB(book: Book): void {
    if (!book || !book.title) {
      return;
    }
    const searchQuery = encodeURIComponent(book.title);
    const url = `https://www.worldofbooks.com/en-gb/search?q=${searchQuery}`;
    window.open(url, '_blank');
    this.closeContextMenu();
  }
}
