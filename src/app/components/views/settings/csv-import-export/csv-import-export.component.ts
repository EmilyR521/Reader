import { Component, OnInit } from '@angular/core';
import { ReadingListService } from '../../../../services/reading-list.service';
import { CsvImportExportService } from '../../../../services/csv-import-export.service';
import { Book } from '../../../../models/book.model';

@Component({
  selector: 'app-csv-import-export',
  templateUrl: './csv-import-export.component.html',
  styleUrls: ['./csv-import-export.component.css']
})
export class CsvImportExportComponent implements OnInit {
  books: Book[] = [];
  isLoading = false;

  constructor(
    private readingListService: ReadingListService,
    private csvService: CsvImportExportService
  ) { }

  ngOnInit(): void {
    // Subscribe to books to get current count
    this.readingListService.books$.subscribe(books => {
      this.books = books;
    });
  }

  exportCSVTemplate(): void {
    this.csvService.exportToCSV([], false);
  }

  exportCSVWithData(): void {
    const books = this.readingListService.getBooks();
    this.csvService.exportToCSV(books, true);
  }

  importCSV(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.isLoading = true;
      
      this.csvService.importFromCSV(
        input.files[0],
        (book) => this.readingListService.addBook(book)
      ).subscribe({
        next: (result) => {
          this.isLoading = false;
          let message = `Successfully imported ${result.success} book(s).`;
          if (result.errors.length > 0) {
            message += `\n\nErrors (${result.errors.length}):\n${result.errors.slice(0, 10).join('\n')}`;
            if (result.errors.length > 10) {
              message += `\n... and ${result.errors.length - 10} more errors`;
            }
          }
          alert(message);
          // Reset input
          input.value = '';
        },
        error: (error) => {
          this.isLoading = false;
          alert(`Failed to import CSV: ${error.message || 'Unknown error'}`);
          input.value = '';
        }
      });
    }
  }
}
