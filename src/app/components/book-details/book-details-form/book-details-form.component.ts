import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { BookLookupService } from '../../../services/book-lookup.service';
import { Book } from '../../../models/book.model';
import { BookStatus } from '../../../models/book-status.model';
import { BookRating } from '../../../models/book-rating.model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-book-details-form',
  templateUrl: './book-details-form.component.html',
  styleUrls: ['./book-details-form.component.css']
})
export class BookDetailsFormComponent implements OnInit, OnChanges {
  @Input() book: Book | null = null;
  @Input() isLoading: boolean = false;
  @Output() save = new EventEmitter<Partial<Book>>();
  @Output() cancel = new EventEmitter<void>();

  imageInputMode: 'url' | 'upload' = 'url';
  imageUrlInput = '';
  isMetadataExpanded = false;
  isLookingUp = false;
  
  // Form fields
  formData: Partial<Book> = {
    title: '',
    author: '',
    status: BookStatus.ToRead,
    publishedDate: undefined,
    readingStartDate: undefined,
    readingEndDate: undefined,
    notes: '',
    tags: [],
    imageUrl: undefined,
    rating: BookRating.None
  };
  
  newTag = '';
  BookStatus = BookStatus;
  BookRating = BookRating;
  statusOptions = Object.values(BookStatus);
  ratingOptions = Object.values(BookRating);

  constructor(
    private bookLookupService: BookLookupService
  ) { }

  ngOnInit(): void {
    if (this.book) {
      this.loadBook(this.book);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['book']) {
      if (this.book) {
        this.loadBook(this.book);
      } else {
        this.resetForm();
      }
    }
  }

  loadBook(book: Book): void {
    this.formData = {
      title: book.title,
      author: book.author,
      status: book.status,
      publishedDate: book.publishedDate ? (book.publishedDate instanceof Date ? book.publishedDate : new Date(book.publishedDate)) : undefined,
      readingStartDate: book.readingStartDate ? (book.readingStartDate instanceof Date ? book.readingStartDate : new Date(book.readingStartDate)) : undefined,
      readingEndDate: book.readingEndDate ? (book.readingEndDate instanceof Date ? book.readingEndDate : new Date(book.readingEndDate)) : undefined,
      notes: book.notes || '',
      tags: book.tags ? [...book.tags] : [],
      imageUrl: book.imageUrl || undefined,
      rating: book.rating || BookRating.None
    };
    this.imageUrlInput = book.imageUrl || '';
  }

  resetForm(): void {
    this.formData = {
      title: '',
      author: '',
      status: BookStatus.ToRead,
      publishedDate: undefined,
      readingStartDate: undefined,
      readingEndDate: undefined,
      notes: '',
      tags: [],
      imageUrl: undefined,
      rating: BookRating.None
    };
    this.newTag = '';
    this.imageUrlInput = '';
    this.imageInputMode = 'url';
  }

  getRatingIcon(rating: BookRating): string {
    switch (rating) {
      case BookRating.Positive:
        return '👍';
      case BookRating.Negative:
        return '👎';
      case BookRating.Favourite:
        return '❤️';
      default:
        return '';
    }
  }

  getRatingLabel(rating: BookRating): string {
    switch (rating) {
      case BookRating.Positive:
        return 'Thumbs Up';
      case BookRating.Negative:
        return 'Thumbs Down';
      case BookRating.Favourite:
        return 'Favourite';
      default:
        return 'No Rating';
    }
  }

  onSave(): void {
    this.save.emit(this.formData);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  addTag(): void {
    if (this.newTag.trim() && !this.formData.tags?.includes(this.newTag.trim())) {
      if (!this.formData.tags) {
        this.formData.tags = [];
      }
      this.formData.tags.push(this.newTag.trim());
      this.newTag = '';
    }
  }

  removeTag(tag: string): void {
    if (this.formData.tags) {
      this.formData.tags = this.formData.tags.filter(t => t !== tag);
    }
  }

  formatDateForInput(date: Date | string | undefined): string {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toISOString().split('T')[0];
  }

  parseDateFromInput(value: string): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }

  onImageUrlChange(): void {
    if (this.imageUrlInput?.trim()) {
      this.formData.imageUrl = this.imageUrlInput.trim();
    } else {
      this.formData.imageUrl = undefined;
    }
  }

  onImageFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        input.value = '';
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        alert('Image file is too large. Please select an image smaller than 5MB.');
        input.value = '';
        return;
      }

      // Convert file to data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          this.formData.imageUrl = result;
          this.imageUrlInput = result; // Also set URL input for display
        }
      };
      reader.onerror = () => {
        alert('Error reading image file. Please try again.');
        input.value = '';
      };
      reader.readAsDataURL(file);
    }
  }

  clearImage(): void {
    this.formData.imageUrl = undefined;
    this.imageUrlInput = '';
    // Clear file input if it exists
    const fileInput = document.getElementById('coverImageFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onPreviewImageError(): void {
    // If preview image fails to load, clear it
    this.clearImage();
    alert('Failed to load image. Please check the URL or try a different image.');
  }

  toggleMetadataSection(): void {
    this.isMetadataExpanded = !this.isMetadataExpanded;
  }

  lookupBookMetadata(): void {
    const title = this.formData.title?.trim();
    const author = this.formData.author?.trim();

    if (!title || !author) {
      alert('Please enter both title and author before looking up metadata.');
      return;
    }

    this.isLookingUp = true;

    // Lookup both cover and publication date in parallel
    forkJoin({
      cover: this.bookLookupService.lookupBookCover(title, author).pipe(
        catchError(() => of(null))
      ),
      publicationDate: this.bookLookupService.lookupPublicationDate(title, author).pipe(
        catchError(() => of(null))
      )
    }).subscribe({
      next: (results) => {
        let updated = false;

        // Update cover image if found
        if (results.cover) {
          this.formData.imageUrl = results.cover;
          this.imageUrlInput = results.cover;
          updated = true;
        }

        // Update publication date if found
        if (results.publicationDate) {
          this.formData.publishedDate = new Date(results.publicationDate);
          updated = true;
        }

        if (updated) {
          // Expand the section to show the updated values
          this.isMetadataExpanded = true;
        } else {
          alert('No metadata found for this book. Please check the title and author, or enter the information manually.');
        }

        this.isLookingUp = false;
      },
      error: (error) => {
        console.error('Error looking up book metadata:', error);
        alert('Error looking up book metadata. Please try again.');
        this.isLookingUp = false;
      }
    });
  }
}
