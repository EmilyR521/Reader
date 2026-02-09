import { Book } from './book.model';

/**
 * Collection Interface
 * Represents a reading list/collection with a name and list of books
 */
export interface Collection {
  id: string;
  name: string;
  bookIds: string[]; // Array of book IDs that belong to this collection
  createdDate: string | Date;
}
