import { Component, OnInit, OnDestroy, Output, EventEmitter, ViewChild, HostListener } from '@angular/core';
import { ReadingListService } from '../../../services/reading-list.service';
import { CollectionService } from '../../../services/collection.service';
import { Book } from '../../../models/book.model';
import { BookStatus } from '../../../models/book-status.model';
import { BookRating } from '../../../models/book-rating.model';
import { Collection } from '../../../models/collection.model';
import { Subscription, combineLatest } from 'rxjs';
import { FilterControlsComponent, ActiveFilter } from '../../filter-controls/filter-controls.component';

type SortField = 'title' | 'author' | 'status' | 'addedDate' | 'readingStartDate' | 'readingEndDate' | 'rating';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-table-view',
  templateUrl: './table-view.component.html',
  styleUrls: ['./table-view.component.css']
})
export class TableViewComponent implements OnInit, OnDestroy {
  books: Book[] = [];
  sortedBooks: Book[] = [];
  sortField: SortField = 'author';
  sortDirection: SortDirection = 'asc';
  
  @Output() viewBook = new EventEmitter<Book>();
  @ViewChild('filterControls') filterControlsComponent!: FilterControlsComponent;
  
  activeFilters: ActiveFilter[] = [];
  dateRangeStart: string | null = null;
  dateRangeEnd: string | null = null;
  selectedYear: number | null = null;
  
  BookStatus = BookStatus;
  BookRating = BookRating;
  
  // Context menu state
  contextMenuVisible = false;
  contextMenuX = 0;
  contextMenuY = 0;
  selectedBook: Book | null = null;
  collections: Collection[] = [];
  submenuOnLeft = false;
  submenuVisible = false;
  
  // Footer collection menu state
  showFooterCollectionMenu = false;
  isAddingToCollection = false;
  
  private booksSubscription?: Subscription;
  private collectionsSubscription?: Subscription;

  constructor(
    private readingListService: ReadingListService,
    private collectionService: CollectionService
  ) {}

  ngOnInit(): void {
    this.booksSubscription = this.readingListService.books$.subscribe(books => {
      this.books = books;
      this.applyFiltersAndSort();
    });

    // Load collections for context menu
    this.collectionsSubscription = this.collectionService.collections$.subscribe(collections => {
      this.collections = collections;
    });
  }

  ngOnDestroy(): void {
    if (this.booksSubscription) {
      this.booksSubscription.unsubscribe();
    }
    if (this.collectionsSubscription) {
      this.collectionsSubscription.unsubscribe();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close context menu when clicking outside
    if (this.contextMenuVisible) {
      this.closeContextMenu();
    }
    // Close footer collection menu when clicking outside
    if (this.showFooterCollectionMenu) {
      const target = event.target as HTMLElement;
      if (!target.closest('.footer-collection-menu-wrapper')) {
        this.closeFooterCollectionMenu();
      }
    }
  }

  @HostListener('document:contextmenu', ['$event'])
  onDocumentRightClick(event: MouseEvent): void {
    // Close context menu when right-clicking elsewhere
    if (this.contextMenuVisible) {
      this.closeContextMenu();
    }
  }

  onFiltersChanged(filters: ActiveFilter[]): void {
    this.activeFilters = filters;
    
    const yearFilter = filters.find(f => f.type === 'year');
    this.selectedYear = yearFilter ? (yearFilter.value as number) : null;
    
    const dateRangeFilter = filters.find(f => f.type === 'dateRange');
    if (dateRangeFilter) {
      const [start, end] = (dateRangeFilter.value as string).split('|');
      this.dateRangeStart = start || null;
      this.dateRangeEnd = end || null;
    } else {
      this.dateRangeStart = null;
      this.dateRangeEnd = null;
    }
    
    this.applyFiltersAndSort();
  }

  sortBy(field: SortField): void {
    if (this.sortField === field) {
      // Toggle direction if clicking the same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New field, default to descending
      this.sortField = field;
      this.sortDirection = 'desc';
    }
    this.applyFiltersAndSort();
  }

  applyFiltersAndSort(): void {
    let filteredBooks = [...this.books];

    // Apply filters
    this.activeFilters.forEach(filter => {
      switch (filter.type) {
        case 'title':
          const titleValue = (filter.value as string).toLowerCase();
          filteredBooks = filteredBooks.filter(book => 
            book.title?.toLowerCase().includes(titleValue)
          );
          break;
        case 'author':
          const authorValue = (filter.value as string).toLowerCase();
          filteredBooks = filteredBooks.filter(book => 
            book.author?.toLowerCase().includes(authorValue)
          );
          break;
        case 'status':
          filteredBooks = filteredBooks.filter(book => 
            book.status === filter.value
          );
          break;
        case 'tag':
          filteredBooks = filteredBooks.filter(book => 
            book.tags && book.tags.includes(filter.value as string)
          );
          break;
        case 'dateRange':
          // Date range filter is handled separately below
          break;
      }
    });

    // Apply year filter if set (takes precedence over date range)
    if (this.selectedYear !== null) {
      filteredBooks = filteredBooks.filter(book => {
        const startDate = this.getDateValue(book.readingStartDate);
        if (!startDate) return false;
        
        let endDate = this.getDateValue(book.readingEndDate);
        if (!endDate) {
          // For books without end date, use current date if reading, or start date + 1 day
          if (book.status === BookStatus.Reading) {
            endDate = new Date();
          } else {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
          }
        }
        
        // Check if book overlaps with the selected year
        const yearStart = new Date(this.selectedYear!, 0, 1);
        const yearEnd = new Date(this.selectedYear!, 11, 31, 23, 59, 59, 999);
        return startDate <= yearEnd && endDate >= yearStart;
      });
    } else if (this.dateRangeStart || this.dateRangeEnd) {
      // Apply date range filter if no year filter is set
      filteredBooks = filteredBooks.filter(book => {
        const startDate = this.getDateValue(book.readingStartDate);
        const endDate = this.getDateValue(book.readingEndDate);
        
        const rangeStart = this.dateRangeStart ? new Date(this.dateRangeStart) : null;
        const rangeEnd = this.dateRangeEnd ? new Date(this.dateRangeEnd) : null;
        
        // Check if book's reading period overlaps with the date range
        // A book matches if:
        // - It has a start date and the range includes it, OR
        // - It has an end date and the range includes it, OR
        // - The book's period overlaps with the range
        
        if (startDate) {
          if (rangeStart && startDate < rangeStart) {
            // Book started before range, check if it extends into range
            if (!endDate || endDate < rangeStart) {
              return false; // Book doesn't overlap with range
            }
          }
          if (rangeEnd && startDate > rangeEnd) {
            return false; // Book started after range
          }
        }
        
        if (endDate) {
          if (rangeEnd && endDate > rangeEnd) {
            // Book finished after range, check if it started within range
            if (!startDate || startDate > rangeEnd) {
              return false; // Book doesn't overlap with range
            }
          }
          if (rangeStart && endDate < rangeStart) {
            return false; // Book finished before range
          }
        }
        
        // If book has no dates, exclude it from date range filter
        if (!startDate && !endDate) {
          return false;
        }
        
        return true;
      });
    }

    // Apply sorting
    this.applySort(filteredBooks);
  }

  applySort(books: Book[] = this.books): void {
    const booksToSort = [...books];
    
    books.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortField) {
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'author':
          aValue = this.getAuthorSurname(a.author);
          bValue = this.getAuthorSurname(b.author);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'addedDate':
          aValue = this.getDateValue(a.addedDate);
          bValue = this.getDateValue(b.addedDate);
          break;
        case 'readingStartDate':
          aValue = this.getDateValue(a.readingStartDate);
          bValue = this.getDateValue(b.readingStartDate);
          break;
        case 'readingEndDate':
          aValue = this.getDateValue(a.readingEndDate);
          bValue = this.getDateValue(b.readingEndDate);
          break;
        case 'rating':
          // Sort by rating priority: Favourite > Positive > Negative > None
          const ratingPriority: { [key: string]: number } = {
            [this.BookRating.Favourite]: 3,
            [this.BookRating.Positive]: 2,
            [this.BookRating.Negative]: 1,
            [this.BookRating.None]: 0
          };
          aValue = ratingPriority[a.rating || this.BookRating.None] ?? 0;
          bValue = ratingPriority[b.rating || this.BookRating.None] ?? 0;
          break;
        default:
          return 0;
      }

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) {
        return 1; // Put null values at the end
      }
      if (bValue === null || bValue === undefined) {
        return -1;
      }

      // Compare values
      let comparison = 0;
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.sortedBooks = books;
  }

  getSortIcon(field: SortField): string {
    if (this.sortField !== field) {
      return '⇅';
    }
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  private getDateValue(date: Date | string | undefined): Date | null {
    if (!date) return null;
    const dateObj = date instanceof Date ? date : new Date(date);
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }

  /**
   * Extract surname from author name (last word) or return the whole name if single word
   */
  private getAuthorSurname(author: string | undefined): string {
    if (!author) return '';
    const trimmed = author.trim();
    if (!trimmed) return '';
    
    const parts = trimmed.split(/\s+/);
    // If there's only one word, use it as the surname
    // Otherwise, use the last word as the surname
    const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    return surname.toLowerCase();
  }

  onViewBook(book: Book): void {
    this.viewBook.emit(book);
  }

  getRatingLabel(rating: BookRating): string {
    switch (rating) {
      case this.BookRating.Positive:
        return 'Thumbs Up';
      case this.BookRating.Negative:
        return 'Thumbs Down';
      case this.BookRating.Favourite:
        return 'Favourite';
      default:
        return '';
    }
  }

  onRowRightClick(event: MouseEvent, book: Book): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.selectedBook = book;
    
    // Position context menu, ensuring it stays within viewport
    const menuWidth = 200;
    const menuHeight = 200; // Approximate
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
    // Determine if submenu should appear on left side (if menu is on right side of screen)
    this.submenuOnLeft = x > window.innerWidth / 2;
    this.contextMenuVisible = true;
  }

  closeContextMenu(): void {
    this.contextMenuVisible = false;
    this.selectedBook = null;
    this.submenuVisible = false;
  }

  addToCollection(collectionId: string): void {
    if (!this.selectedBook) {
      return;
    }

    this.collectionService.addBookToCollection(collectionId, this.selectedBook.id)
      .subscribe({
        next: () => {
          this.closeContextMenu();
        },
        error: (error) => {
          console.error('Error adding book to collection:', error);
          alert('Failed to add book to collection. Please try again.');
        }
      });
  }

  getAvailableCollections(): Collection[] {
    if (!this.selectedBook) {
      return this.collections;
    }
    // Filter out collections that already contain this book
    return this.collections.filter(collection => !collection.bookIds.includes(this.selectedBook!.id));
  }

  toggleFooterCollectionMenu(): void {
    this.showFooterCollectionMenu = !this.showFooterCollectionMenu;
  }

  closeFooterCollectionMenu(): void {
    this.showFooterCollectionMenu = false;
  }

  addAllFilteredBooksToCollection(collectionId: string): void {
    if (this.sortedBooks.length === 0 || this.isAddingToCollection) {
      return;
    }

    this.isAddingToCollection = true;
    const collection = this.collections.find(c => c.id === collectionId);
    
    if (!collection) {
      this.isAddingToCollection = false;
      return;
    }

    // Get books that aren't already in the collection
    const booksToAdd = this.sortedBooks.filter(book => !collection.bookIds.includes(book.id));
    
    if (booksToAdd.length === 0) {
      alert('All filtered books are already in this collection.');
      this.isAddingToCollection = false;
      this.closeFooterCollectionMenu();
      return;
    }

    // Add books sequentially to avoid race conditions
    let completed = 0;
    let failed = 0;
    const total = booksToAdd.length;
    let currentIndex = 0;

    const addNextBook = () => {
      if (currentIndex >= booksToAdd.length) {
        // All books processed
        this.isAddingToCollection = false;
        this.closeFooterCollectionMenu();
        if (failed === 0) {
          alert(`Successfully added ${completed} book${completed === 1 ? '' : 's'} to "${collection.name}"!`);
        } else {
          alert(`Added ${completed} book${completed === 1 ? '' : 's'} to "${collection.name}". ${failed} failed.`);
        }
        return;
      }

      const book = booksToAdd[currentIndex];
      currentIndex++;

      this.collectionService.addBookToCollection(collectionId, book.id)
        .subscribe({
          next: () => {
            completed++;
            // Continue with next book
            addNextBook();
          },
          error: (error) => {
            console.error(`Error adding book "${book.title}" to collection:`, error);
            failed++;
            // Continue with next book even if this one failed
            addNextBook();
          }
        });
    };

    // Start adding books
    addNextBook();
  }

  getFooterAvailableCollections(): Collection[] {
    // Return all collections - user can add books even if some are already in the collection
    // (the service will handle duplicates)
    return this.collections;
  }

  hasActiveFilters(): boolean {
    return this.activeFilters.length > 0 || this.selectedYear !== null || 
           this.dateRangeStart !== null || this.dateRangeEnd !== null;
  }

}
