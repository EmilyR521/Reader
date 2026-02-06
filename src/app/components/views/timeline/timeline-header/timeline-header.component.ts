import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Book } from '../../../../models/book.model';
import { BookStatus } from '../../../../models/book-status.model';

export enum SortOption {
  ReadingStartDateDesc = 'readingStartDateDesc',
  ReadingStartDateAsc = 'readingStartDateAsc',
  ReadingEndDateDesc = 'readingEndDateDesc',
  ReadingEndDateAsc = 'readingEndDateAsc',
  TitleAsc = 'titleAsc',
  TitleDesc = 'titleDesc',
  AuthorAsc = 'authorAsc',
  AuthorDesc = 'authorDesc',
  AddedDateDesc = 'addedDateDesc',
  AddedDateAsc = 'addedDateAsc',
  Status = 'status'
}

@Component({
  selector: 'app-timeline-header',
  templateUrl: './timeline-header.component.html',
  styleUrls: ['./timeline-header.component.css']
})
export class TimelineHeaderComponent {
  @Input() books: Book[] = [];

  BookStatus = BookStatus;

  getFinishedCount(): number {
    return this.books.filter(book => book.status === BookStatus.Finished).length;
  }

  getReadingCount(): number {
    return this.books.filter(book => book.status === BookStatus.Reading).length;
  }

  getToReadCount(): number {
    return this.books.filter(book => book.status === BookStatus.ToRead).length;
  }
}
