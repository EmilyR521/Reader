const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DEFAULT_USER = 'Test';

// Middleware
app.use(cors());
app.use(express.json());

// Get user-specific data file path
function getUserDataFile(user) {
  const sanitizedUser = (user || DEFAULT_USER).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `${sanitizedUser}.json`);
}

// Ensure data directory exists
async function ensureDataDirectory() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Ensure default user file exists
    const defaultFile = getUserDataFile(DEFAULT_USER);
    try {
      await fs.access(defaultFile);
    } catch {
      // File doesn't exist, create with new format
      const newData = {
        metadata: {
          username: DEFAULT_USER,
          icon: '📚'
        },
        books: []
      };
      await fs.writeFile(defaultFile, JSON.stringify(newData, null, 2), 'utf8');
    }
  } catch (error) {
    console.error('Error setting up data directory:', error);
  }
}

// Read user data file (returns full structure with metadata and books)
async function readUserData(user) {
  try {
    const dataFile = getUserDataFile(user);
    const data = await fs.readFile(dataFile, 'utf8');
    const parsed = JSON.parse(data);
    
    // Validate structure
    if (!parsed.metadata) {
      parsed.metadata = {
        username: user,
        icon: '📚'
      };
    }
    
    if (!parsed.books) {
      parsed.books = [];
    }
    
    return parsed;
  } catch (error) {
    // If file doesn't exist, return default structure
    if (error.code === 'ENOENT') {
      return {
        metadata: {
          username: user,
          icon: '📚'
        },
        books: []
      };
    }
    console.error('Error reading user data:', error);
    return {
      metadata: {
        username: user,
        icon: '📚'
      },
      books: []
    };
  }
}

// Read books from file for a specific user (returns just the books array)
async function readBooks(user) {
  const userData = await readUserData(user);
  return userData.books;
}

// Write books to file for a specific user
async function writeBooks(user, books, metadata = null) {
  try {
    const dataFile = getUserDataFile(user);
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Read existing data to preserve metadata
    const existingData = await readUserData(user);
    
    // Update metadata if provided
    if (metadata) {
      existingData.metadata = {
        ...existingData.metadata,
        ...metadata
      };
    }
    
    // Update books
    existingData.books = books;
    
    await fs.writeFile(dataFile, JSON.stringify(existingData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing books:', error);
    return false;
  }
}

// Update user metadata
async function updateUserMetadata(user, metadata) {
  try {
    const existingData = await readUserData(user);
    existingData.metadata = {
      ...existingData.metadata,
      ...metadata
    };
    const dataFile = getUserDataFile(user);
    await fs.writeFile(dataFile, JSON.stringify(existingData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error updating user metadata:', error);
    return false;
  }
}

// Get all available users (based on JSON files in data directory)
async function getAllUsers() {
  try {
    const files = await fs.readdir(DATA_DIR);
    const users = files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''))
      .sort();
    return users.length > 0 ? users : [DEFAULT_USER];
  } catch (error) {
    console.error('Error getting users:', error);
    return [DEFAULT_USER];
  }
}

// API Routes

// GET /api/users - Get all available users with metadata
app.get('/api/users', async (req, res) => {
  try {
    const userNames = await getAllUsers();
    const usersWithMetadata = await Promise.all(
      userNames.map(async (userName) => {
        const userData = await readUserData(userName);
        return {
          username: userName,
          icon: userData.metadata?.icon || '📚'
        };
      })
    );
    res.json(usersWithMetadata);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// POST /api/users - Create a new user with metadata
app.post('/api/users', async (req, res) => {
  try {
    const { username, icon } = req.body;
    
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const sanitizedUser = username.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const userData = await readUserData(sanitizedUser);
    
    // Update metadata
    userData.metadata = {
      username: sanitizedUser,
      icon: icon || '📚'
    };
    
    const dataFile = getUserDataFile(sanitizedUser);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify(userData, null, 2), 'utf8');
    
    res.status(201).json({
      username: sanitizedUser,
      icon: userData.metadata.icon
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET /api/books - Get all books for a user
app.get('/api/books', async (req, res) => {
  try {
    const user = req.query.user || DEFAULT_USER;
    const books = await readBooks(user);
    res.json(books);
  } catch (error) {
    console.error('Error getting books:', error);
    res.status(500).json({ error: 'Failed to retrieve books' });
  }
});

// POST /api/books - Add a new book
app.post('/api/books', async (req, res) => {
  try {
    const user = req.query.user || req.body.user || DEFAULT_USER;
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

    const books = await readBooks(user);
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
    const success = await writeBooks(user, books, null);
    
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
    const user = req.query.user || req.body.user || DEFAULT_USER;
    const { id } = req.params;
    const updates = req.body;

    const books = await readBooks(user);
    const index = books.findIndex(book => book.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Book not found' });
    }

    books[index] = { ...books[index], ...updates };
    const success = await writeBooks(user, books, null);

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
    const user = req.query.user || DEFAULT_USER;
    const { id } = req.params;

    const books = await readBooks(user);
    const filteredBooks = books.filter(book => book.id !== id);

    if (books.length === filteredBooks.length) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const success = await writeBooks(user, filteredBooks, null);

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
    console.log(`Data directory: ${DATA_DIR}`);
  });
}

startServer().catch(console.error);
