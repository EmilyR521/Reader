import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Book } from '../../models/book.model';
import { BookStatus } from '../../models/book-status.model';

export type FilterType = 'year' | 'title' | 'author' | 'status' | 'tag' | 'dateRange';

export interface ActiveFilter {
  type: FilterType;
  value: string | number;
  label: string;
}

@Component({
  selector: 'app-filter-controls',
  templateUrl: './filter-controls.component.html',
  styleUrls: ['./filter-controls.component.css']
})
export class FilterControlsComponent implements OnChanges {
  @Input() books: Book[] = [];
  @Input() mode: 'graph' | 'table' = 'table';
  @Output() filtersChanged = new EventEmitter<ActiveFilter[]>();

  // Graph mode: year filters and date range
  availableYears: number[] = [];
  selectedYear: number | null = null;
  dateRangeStart: string = '';
  dateRangeEnd: string = '';
  isGraphExpanded = false;

  // Table mode: column filters
  titleFilter: string = '';
  authorFilter: string = '';
  selectedStatuses: Set<BookStatus> = new Set();
  selectedTags: Set<string> = new Set();
  availableStatuses: BookStatus[] = [];
  availableTags: string[] = [];
  filteredStatuses: BookStatus[] = [];
  filteredTags: string[] = [];
  showStatusDropdown = false;
  showTagsDropdown = false;
  isExpanded = false;
  tableDateRangeStart: string = '';
  tableDateRangeEnd: string = '';
  tableSelectedYear: number | null = null;
  tableAvailableYears: number[] = [];

  activeFilters: ActiveFilter[] = [];
  BookStatus = BookStatus;

  @ViewChild('statusDropdown', { static: false }) statusDropdown?: ElementRef;
  @ViewChild('tagsDropdown', { static: false }) tagsDropdown?: ElementRef;

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.mode === 'table') {
      const target = event.target as HTMLElement;
      const clickedInside = this.elementRef.nativeElement.contains(target);
      
      if (!clickedInside) {
        this.showStatusDropdown = false;
        this.showTagsDropdown = false;
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['books'] && this.books) {
      if (this.mode === 'graph') {
        this.extractYears();
      } else {
        this.extractStatuses();
        this.extractTags();
        this.extractTableYears();
      }
      this.updateActiveFilters();
    }
  }

  // Graph mode methods
  extractYears(): void {
    const yearSet = new Set<number>();
    this.books.forEach(book => {
      const startDate = this.parseDate(book.readingStartDate);
      if (startDate) {
        yearSet.add(startDate.getFullYear());
      }
      const endDate = this.parseDate(book.readingEndDate);
      if (endDate) {
        yearSet.add(endDate.getFullYear());
      }
    });
    this.availableYears = Array.from(yearSet).sort((a, b) => b - a); // Most recent first
  }

  filterByYear(year: number): void {
    if (this.selectedYear === year) {
      this.selectedYear = null; // Toggle off if already selected
    } else {
      this.selectedYear = year;
      // Clear date range when selecting a year
      this.dateRangeStart = '';
      this.dateRangeEnd = '';
    }
    this.updateActiveFilters();
    this.emitFilters();
  }

  // Table mode methods
  extractStatuses(): void {
    const statusSet = new Set<BookStatus>();
    this.books.forEach(book => {
      if (book.status) {
        statusSet.add(book.status);
      }
    });
    this.availableStatuses = Array.from(statusSet).sort();
    this.filteredStatuses = [...this.availableStatuses];
  }

  extractTags(): void {
    const tagSet = new Set<string>();
    this.books.forEach(book => {
      if (book.tags && book.tags.length > 0) {
        book.tags.forEach(tag => tagSet.add(tag));
      }
    });
    this.availableTags = Array.from(tagSet).sort();
    this.filteredTags = [...this.availableTags];
  }

  extractTableYears(): void {
    const yearSet = new Set<number>();
    this.books.forEach(book => {
      const startDate = this.parseDate(book.readingStartDate);
      if (startDate) {
        yearSet.add(startDate.getFullYear());
      }
      const endDate = this.parseDate(book.readingEndDate);
      if (endDate) {
        yearSet.add(endDate.getFullYear());
      }
    });
    this.tableAvailableYears = Array.from(yearSet).sort((a, b) => b - a); // Most recent first
  }

  filterStatuses(searchTerm: string): void {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredStatuses = [...this.availableStatuses];
    } else {
      this.filteredStatuses = this.availableStatuses.filter(status =>
        status.toLowerCase().includes(term)
      );
    }
  }

  filterTags(searchTerm: string): void {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredTags = [...this.availableTags];
    } else {
      this.filteredTags = this.availableTags.filter(tag =>
        tag.toLowerCase().includes(term)
      );
    }
  }

  onTitleFilterChange(value: string): void {
    this.titleFilter = value;
    this.updateActiveFilters();
    this.emitFilters();
  }

  onAuthorFilterChange(value: string): void {
    this.authorFilter = value;
    this.updateActiveFilters();
    this.emitFilters();
  }

  toggleStatus(status: BookStatus): void {
    if (this.selectedStatuses.has(status)) {
      this.selectedStatuses.delete(status);
    } else {
      this.selectedStatuses.add(status);
    }
    this.updateActiveFilters();
    this.emitFilters();
  }

  toggleTag(tag: string): void {
    if (this.selectedTags.has(tag)) {
      this.selectedTags.delete(tag);
    } else {
      this.selectedTags.add(tag);
    }
    this.updateActiveFilters();
    this.emitFilters();
  }

  filterByStatus(status: BookStatus, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.toggleStatus(status);
  }

  filterByTag(tag: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.toggleTag(tag);
  }

  filterByAuthor(author: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.authorFilter = author;
    this.updateActiveFilters();
    this.emitFilters();
  }

  removeFilter(filter: ActiveFilter): void {
    switch (filter.type) {
      case 'year':
        if (this.mode === 'graph') {
          this.selectedYear = null;
        } else {
          this.tableSelectedYear = null;
        }
        break;
      case 'dateRange':
        if (this.mode === 'graph') {
          this.dateRangeStart = '';
          this.dateRangeEnd = '';
        } else {
          this.tableDateRangeStart = '';
          this.tableDateRangeEnd = '';
        }
        break;
      case 'title':
        this.titleFilter = '';
        break;
      case 'author':
        this.authorFilter = '';
        break;
      case 'status':
        this.selectedStatuses.delete(filter.value as BookStatus);
        break;
      case 'tag':
        this.selectedTags.delete(filter.value as string);
        break;
    }
    this.updateActiveFilters();
    this.emitFilters();
  }

  clearAllFilters(): void {
    this.selectedYear = null;
    this.dateRangeStart = '';
    this.dateRangeEnd = '';
    this.tableSelectedYear = null;
    this.tableDateRangeStart = '';
    this.tableDateRangeEnd = '';
    this.titleFilter = '';
    this.authorFilter = '';
    this.selectedStatuses.clear();
    this.selectedTags.clear();
    this.showStatusDropdown = false;
    this.showTagsDropdown = false;
    this.updateActiveFilters();
    this.emitFilters();
  }

  onTableDateRangeChange(): void {
    // Clear year filter when date range is set
    if (this.tableDateRangeStart || this.tableDateRangeEnd) {
      this.tableSelectedYear = null;
    }
    this.updateActiveFilters();
    this.emitFilters();
  }

  filterByTableYear(year: number): void {
    if (this.tableSelectedYear === year) {
      this.tableSelectedYear = null; // Toggle off if already selected
    } else {
      this.tableSelectedYear = year;
      // Clear date range when selecting a year
      this.tableDateRangeStart = '';
      this.tableDateRangeEnd = '';
    }
    this.updateActiveFilters();
    this.emitFilters();
  }

  private updateActiveFilters(): void {
    this.activeFilters = [];

    if (this.mode === 'graph') {
      if (this.selectedYear !== null) {
        this.activeFilters.push({
          type: 'year',
          value: this.selectedYear,
          label: this.selectedYear.toString()
        });
      }
      if (this.dateRangeStart || this.dateRangeEnd) {
        const startLabel = this.dateRangeStart ? new Date(this.dateRangeStart).toLocaleDateString() : '...';
        const endLabel = this.dateRangeEnd ? new Date(this.dateRangeEnd).toLocaleDateString() : '...';
        this.activeFilters.push({
          type: 'dateRange',
          value: `${this.dateRangeStart}|${this.dateRangeEnd}`,
          label: `${startLabel} - ${endLabel}`
        });
      }
    } else {
      if (this.titleFilter.trim()) {
        this.activeFilters.push({
          type: 'title',
          value: this.titleFilter.trim(),
          label: `Title: ${this.titleFilter.trim()}`
        });
      }
      if (this.authorFilter.trim()) {
        this.activeFilters.push({
          type: 'author',
          value: this.authorFilter.trim(),
          label: `Author: ${this.authorFilter.trim()}`
        });
      }
      if (this.tableSelectedYear !== null) {
        this.activeFilters.push({
          type: 'year',
          value: this.tableSelectedYear,
          label: this.tableSelectedYear.toString()
        });
      }
      if (this.tableDateRangeStart || this.tableDateRangeEnd) {
        const startLabel = this.tableDateRangeStart ? new Date(this.tableDateRangeStart).toLocaleDateString() : '...';
        const endLabel = this.tableDateRangeEnd ? new Date(this.tableDateRangeEnd).toLocaleDateString() : '...';
        this.activeFilters.push({
          type: 'dateRange',
          value: `${this.tableDateRangeStart}|${this.tableDateRangeEnd}`,
          label: `Date: ${startLabel} - ${endLabel}`
        });
      }
      this.selectedStatuses.forEach(status => {
        this.activeFilters.push({
          type: 'status',
          value: status,
          label: `Status: ${status}`
        });
      });
      this.selectedTags.forEach(tag => {
        this.activeFilters.push({
          type: 'tag',
          value: tag,
          label: `Tag: ${tag}`
        });
      });
    }
  }

  private emitFilters(): void {
    this.filtersChanged.emit([...this.activeFilters]);
  }

  private parseDate(date: string | Date | undefined): Date | null {
    if (!date) return null;
    if (date instanceof Date) return date;
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  get hasActiveFilters(): boolean {
    return this.activeFilters.length > 0;
  }

  toggleStatusDropdown(): void {
    this.showStatusDropdown = !this.showStatusDropdown;
    if (this.showStatusDropdown) {
      this.showTagsDropdown = false;
      // Reset search filter when opening
      this.filteredStatuses = [...this.availableStatuses];
    }
  }

  toggleTagsDropdown(): void {
    this.showTagsDropdown = !this.showTagsDropdown;
    if (this.showTagsDropdown) {
      this.showStatusDropdown = false;
      // Reset search filter when opening
      this.filteredTags = [...this.availableTags];
    }
  }

  isStatusSelected(status: BookStatus): boolean {
    return this.selectedStatuses.has(status);
  }

  isTagSelected(tag: string): boolean {
    return this.selectedTags.has(tag);
  }

  toggleExpander(): void {
    this.isExpanded = !this.isExpanded;
    // Close dropdowns when collapsing
    if (!this.isExpanded) {
      this.showStatusDropdown = false;
      this.showTagsDropdown = false;
    }
  }

  toggleGraphExpander(): void {
    this.isGraphExpanded = !this.isGraphExpanded;
  }

  onDateRangeChange(): void {
    // Clear year filter when date range is set
    if (this.dateRangeStart || this.dateRangeEnd) {
      this.selectedYear = null;
    }
    this.updateActiveFilters();
    this.emitFilters();
  }

  formatDateForInput(date: Date | string | undefined): string {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toISOString().split('T')[0];
  }
}
