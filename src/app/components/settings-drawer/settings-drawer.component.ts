import { Component, EventEmitter, Output } from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { CoverLookupService } from '../../services/cover-lookup.service';
import { ReadingListService } from '../../services/reading-list.service';

@Component({
  selector: 'app-settings-drawer',
  templateUrl: './settings-drawer.component.html',
  styleUrls: ['./settings-drawer.component.css']
})
export class SettingsDrawerComponent {
  @Output() drawerClose = new EventEmitter<void>();

  isLookingUpData = false;
  isCsvExpanded = false;
  isLookupDataExpanded = false;
  lookupOptions = {
    covers: false,
    publicationDates: false
  };

  constructor(
    public themeService: ThemeService,
    private coverLookupService: CoverLookupService,
    private readingListService: ReadingListService
  ) {}

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  onThemeChange(theme: 'bookish-light' | 'bookish-dark' | 'minimal-light' | 'minimal-dark'): void {
    this.themeService.setTheme(theme);
  }

  toggleCsvSection(): void {
    this.isCsvExpanded = !this.isCsvExpanded;
  }

  toggleLookupDataSection(): void {
    this.isLookupDataExpanded = !this.isLookupDataExpanded;
  }

  toggleLookupOption(option: 'covers' | 'publicationDates'): void {
    this.lookupOptions[option] = !this.lookupOptions[option];
  }

  lookupData(): void {
    if (this.isLookingUpData) {
      return;
    }

    if (!this.lookupOptions.covers && !this.lookupOptions.publicationDates) {
      alert('Please select at least one lookup option.');
      return;
    }

    const books = this.readingListService.getBooks();
    let message = '';

    if (this.lookupOptions.covers) {
      const booksWithoutCovers = books.filter(book => !book.imageUrl);
      message += `Covers: ${booksWithoutCovers.length} book(s)`;
    }

    if (this.lookupOptions.publicationDates) {
      const booksWithoutDates = books.filter(book => !book.publishedDate);
      if (message) message += '\n';
      message += `Publication dates: ${booksWithoutDates.length} book(s)`;
    }

    if (!confirm(`Look up data for:\n${message}\n\nThis may take a few moments.`)) {
      return;
    }

    this.isLookingUpData = true;

    this.coverLookupService.lookupData(this.lookupOptions).subscribe({
      next: (results) => {
        this.isLookingUpData = false;
        let resultMessage = 'Lookup complete!\n\n';
        
        if (this.lookupOptions.covers && results.covers.total > 0) {
          resultMessage += `Covers: Found ${results.covers.found} out of ${results.covers.total}\n`;
        }
        
        if (this.lookupOptions.publicationDates && results.publicationDates.total > 0) {
          resultMessage += `Publication dates: Found ${results.publicationDates.found} out of ${results.publicationDates.total}`;
        }
        
        alert(resultMessage);
      },
      error: (error) => {
        console.error('Error during data lookup:', error);
        this.isLookingUpData = false;
        alert('An error occurred during data lookup. Please try again.');
      }
    });
  }

  close(): void {
    this.drawerClose.emit();
  }
}
