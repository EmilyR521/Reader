const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'reading-list.json');
const DATA_DIR = path.join(__dirname, 'data');

// Middleware
app.use(cors());
app.use(express.json());

// Ensure data directory exists
async function ensureDataDirectory() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    // Check if file exists, if not create empty array
    try {
      await fs.access(DATA_FILE);
    } catch {
      await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error('Error setting up data directory:', error);
  }
}

// Read books from file
async function readBooks() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading books:', error);
    return [];
  }
}

// Write books to file
async function writeBooks(books) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(books, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing books:', error);
    return false;
  }
}

// API Routes

// GET /api/books - Get all books
app.get('/api/books', async (req, res) => {
  try {
    const books = await readBooks();
    res.json(books);
  } catch (error) {
    console.error('Error getting books:', error);
    res.status(500).json({ error: 'Failed to retrieve books' });
  }
});

// POST /api/books - Add a new book
app.post('/api/books', async (req, res) => {
  try {
    const { 
      title, 
      author, 
      publishedDate, 
      status, 
      readingStartDate, 
      readingEndDate, 
      notes, 
      tags,
      imageUrl
    } = req.body;
    
    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }

    // Validate status
    const validStatuses = ['to read', 'reading', 'finished', 'on hold', 'abandoned'];
    const bookStatus = status && validStatuses.includes(status) ? status : 'to read';

    const books = await readBooks();
    const newBook = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      title: title.trim(),
      author: author.trim(),
      addedDate: new Date().toISOString(),
      publishedDate: publishedDate || null,
      status: bookStatus,
      readingStartDate: readingStartDate || null,
      readingEndDate: readingEndDate || null,
      notes: notes ? notes.trim() : null,
      tags: Array.isArray(tags) ? tags.map(t => t.trim()).filter(t => t) : [],
      imageUrl: imageUrl || null
    };

    books.push(newBook);
    const success = await writeBooks(books);
    
    if (success) {
      res.status(201).json(newBook);
    } else {
      res.status(500).json({ error: 'Failed to save book' });
    }
  } catch (error) {
    console.error('Error adding book:', error);
    res.status(500).json({ error: 'Failed to add book' });
  }
});

// PUT /api/books/:id - Update a book
app.put('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const books = await readBooks();
    const index = books.findIndex(book => book.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Book not found' });
    }

    books[index] = { ...books[index], ...updates };
    const success = await writeBooks(books);

    if (success) {
      res.json(books[index]);
    } else {
      res.status(500).json({ error: 'Failed to update book' });
    }
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

// DELETE /api/books/:id - Delete a book
app.delete('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const books = await readBooks();
    const filteredBooks = books.filter(book => book.id !== id);

    if (books.length === filteredBooks.length) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const success = await writeBooks(filteredBooks);

    if (success) {
      res.status(204).send();
    } else {
      res.status(500).json({ error: 'Failed to delete book' });
    }
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
async function startServer() {
  await ensureDataDirectory();
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Data file: ${DATA_FILE}`);
  });
}

startServer().catch(console.error);
