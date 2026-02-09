import { BookStatus } from './book-status.model';
import { BookRating } from './book-rating.model';
import { BookOwned } from './book-owned.model';

/**
 * Book Interface
 * Represents a book in the reading list
 */
export interface Book {
  id: string;
  title: string; // required
  author: string; // required
  addedDate: string | Date;
  publishedDate?: string | Date;
  status: BookStatus;
  readingStartDate?: string | Date;
  readingEndDate?: string | Date;
  notes?: string;
  tags?: string[];
  imageUrl?: string; // Cover image URL from Open Library
  rating?: BookRating;
  owned?: BookOwned;
}
