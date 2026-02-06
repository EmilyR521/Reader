import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { ReadingListService } from '../../../services/reading-list.service';
import { TimelineService, TimelineGroup } from '../../../services/timeline.service';
import { Book } from '../../../models/book.model';
import { BookStatus } from '../../../models/book-status.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.css']
})
export class TimelineComponent implements OnInit, OnDestroy {
  books: Book[] = [];
  timelineGroups: TimelineGroup[] = [];
  isLoading = false;
  
  @Output() viewBook = new EventEmitter<Book>();
  
  BookStatus = BookStatus;
  
  private booksSubscription?: Subscription;

  constructor(
    private readingListService: ReadingListService,
    private timelineService: TimelineService
  ) { }

  ngOnInit(): void {
    this.booksSubscription = this.readingListService.books$.subscribe(books => {
      this.books = books;
      this.timelineGroups = this.timelineService.buildTimeline(books);
    });
  }

  ngOnDestroy(): void {
    if (this.booksSubscription) {
      this.booksSubscription.unsubscribe();
    }
  }

  onViewBook(book: Book): void {
    this.viewBook.emit(book);
  }
}
