import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Book } from '../../../../models/book.model';
import { BookStatus } from '../../../../models/book-status.model';
import { BookRating } from '../../../../models/book-rating.model';

@Component({
  selector: 'app-book-item',
  templateUrl: './book-item.component.html',
  styleUrls: ['./book-item.component.css']
})
export class BookItemComponent implements OnChanges {
  @Input() book!: Book;
  
  @Output() view = new EventEmitter<Book>();
  @Output() edit = new EventEmitter<Book>();
  @Output() remove = new EventEmitter<string>();

  BookStatus = BookStatus;
  BookRating = BookRating;
  imageError = false;

  ngOnChanges(changes: SimpleChanges): void {
    // Reset image error when book changes
    if (changes['book']) {
      this.imageError = false;
    }
  }

  onItemClick(): void {
    this.view.emit(this.book);
  }

  onImageError(event: Event): void {
    // Mark image as failed to show placeholder
    this.imageError = true;
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
        return '';
    }
  }
}
