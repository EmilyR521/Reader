import { Injectable } from '@angular/core';
import { Book } from '../models/book.model';

export interface TimelineGroup {
  monthLabel: string;
  monthKey: string;
  books: Book[];
}

@Injectable({
  providedIn: 'root'
})
export class TimelineService {
  /**
   * Build timeline groups from books, filtering out books without reading start dates
   * and grouping by finished date (or most recent month if no finished date)
   */
  buildTimeline(books: Book[]): TimelineGroup[] {
    // Filter out books that don't have a reading start date
    const booksWithStartDate = books.filter(book => {
      const startDate = this.getDateValue(book.readingStartDate);
      return startDate !== null;
    });

    // Sort by timeline: most recently started, then most recently finished
    const sortedBooks = this.sortBooksForTimeline(booksWithStartDate);

    // Find the most recent month among all books (prioritizing finished dates)
    const mostRecentMonth = this.findMostRecentMonth(sortedBooks);

    // Group books by month based on finished date (or most recent month if no finished date)
    const groupsMap = new Map<string, TimelineGroup>();

    sortedBooks.forEach(book => {
      // Use finished date for grouping if available, otherwise use most recent month
      let dateForGrouping = this.getDateValue(book.readingEndDate);
      
      if (!dateForGrouping) {
        // Books without finished dates go into the most recent month
        dateForGrouping = mostRecentMonth || new Date();
      }

      const monthKey = `${dateForGrouping.getFullYear()}-${String(dateForGrouping.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = dateForGrouping.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!groupsMap.has(monthKey)) {
        groupsMap.set(monthKey, {
          monthKey,
          monthLabel,
          books: []
        });
      }
      groupsMap.get(monthKey)!.books.push(book);
    });

    // Convert map to array and sort by month key (most recent first)
    return Array.from(groupsMap.values()).sort((a, b) => {
      return b.monthKey.localeCompare(a.monthKey);
    });
  }

  /**
   * Find the most recent month among all books (prioritizing finished dates, then start dates)
   */
  private findMostRecentMonth(books: Book[]): Date {
    if (books.length === 0) {
      return new Date(); // Fallback to current month
    }

    let mostRecent: Date | null = null;

    books.forEach(book => {
      // Prioritize finished dates, fallback to start dates
      const finishedDate = this.getDateValue(book.readingEndDate);
      const startDate = this.getDateValue(book.readingStartDate);
      
      const dateToConsider = finishedDate || startDate;
      
      if (dateToConsider) {
        // Get the first day of the month for comparison
        const monthStart = new Date(dateToConsider.getFullYear(), dateToConsider.getMonth(), 1);
        
        if (!mostRecent || monthStart > mostRecent) {
          mostRecent = monthStart;
        }
      }
    });

    return mostRecent || new Date(); // Fallback to current month if no dates found
  }

  /**
   * Sort books for timeline: most recently started, then most recently finished
   */
  private sortBooksForTimeline(books: Book[]): Book[] {
    return books.sort((a, b) => {
      // Primary sort: by reading start date (most recent first)
      const startDateA = this.getDateValue(a.readingStartDate)!;
      const startDateB = this.getDateValue(b.readingStartDate)!;

      const startDiff = startDateB.getTime() - startDateA.getTime();
      if (startDiff !== 0) return startDiff;

      // Secondary sort: by reading end date (most recent first) if start dates are equal
      const endDateA = this.getDateValue(a.readingEndDate);
      const endDateB = this.getDateValue(b.readingEndDate);

      if (endDateA && endDateB) {
        return endDateB.getTime() - endDateA.getTime();
      } else if (endDateA && !endDateB) {
        return -1;
      } else if (!endDateA && endDateB) {
        return 1;
      }

      return 0;
    });
  }

  /**
   * Convert date value to Date object or null
   */
  private getDateValue(date: Date | string | undefined): Date | null {
    if (!date) return null;
    const dateObj = date instanceof Date ? date : new Date(date);
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }
}
