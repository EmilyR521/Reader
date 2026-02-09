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
// Increase JSON body size limit to 50MB for large imports
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Get user-specific data file path
function getUserDataFile(user) {
  const sanitizedUser = (user || DEFAULT_USER).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `${sanitizedUser}.json`);
}

// Ensure data directory exists
async function ensureDataDirectory() {
  try {
    // Create data directory if it doesn't exist (recursive: true creates parent dirs if needed)
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log(`✓ Data directory ensured: ${DATA_DIR}`);
    
    // Verify the directory exists and is accessible
    try {
      await fs.access(DATA_DIR);
      console.log(`✓ Data directory is accessible`);
    } catch (accessError) {
      console.error('✗ Data directory exists but is not accessible:', accessError);
      throw new Error(`Data directory ${DATA_DIR} is not accessible`);
    }
    
    // Ensure default user file exists
    const defaultFile = getUserDataFile(DEFAULT_USER);
    try {
      await fs.access(defaultFile);
      console.log(`✓ Default user file exists: ${defaultFile}`);
    } catch {
      // File doesn't exist, create with new format
      const newData = {
        metadata: {
          username: DEFAULT_USER,
          icon: '📚'
        },
        books: [],
        collections: []
      };
      await fs.writeFile(defaultFile, JSON.stringify(newData, null, 2), 'utf8');
      console.log(`✓ Created default user file: ${defaultFile}`);
    }
  } catch (error) {
    console.error('✗ Error setting up data directory:', error);
    console.error('  This is a critical error. The server may not function correctly.');
    throw error; // Re-throw to prevent server from starting with invalid state
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
    
    if (!parsed.collections) {
      parsed.collections = [];
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
        books: [],
        collections: []
      };
    }
    console.error('Error reading user data:', error);
    return {
      metadata: {
        username: user,
        icon: '📚'
      },
      books: [],
      collections: []
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

// Read collections from file for a specific user (returns just the collections array)
async function readCollections(user) {
  const userData = await readUserData(user);
  return userData.collections || [];
}

// Write collections to file for a specific user
async function writeCollections(user, collections) {
  try {
    const dataFile = getUserDataFile(user);
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Read existing data to preserve metadata and books
    const existingData = await readUserData(user);
    
    // Update collections
    existingData.collections = collections;
    
    await fs.writeFile(dataFile, JSON.stringify(existingData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing collections:', error);
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

// GET /api/users/:username/export - Export user data as JSON
app.get('/api/users/:username/export', async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const sanitizedUser = username.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const userData = await readUserData(sanitizedUser);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedUser}-backup.json"`);
    res.json(userData);
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ error: 'Failed to export user data' });
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

// POST /api/users/:username/import - Import user data from JSON
app.post('/api/users/:username/import', async (req, res) => {
  try {
    const { username } = req.params;
    const { userData, replaceExisting } = req.body;
    
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    if (!userData) {
      return res.status(400).json({ error: 'User data is required' });
    }
    
    // Validate JSON structure
    if (!userData.metadata || !userData.metadata.username) {
      return res.status(400).json({ error: 'Invalid user data format: metadata.username is required' });
    }
    
    if (!Array.isArray(userData.books)) {
      return res.status(400).json({ error: 'Invalid user data format: books must be an array' });
    }
    
    if (!Array.isArray(userData.collections)) {
      return res.status(400).json({ error: 'Invalid user data format: collections must be an array' });
    }
    
    const sanitizedUser = username.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // If replaceExisting is false, merge with existing data
    let finalData;
    if (replaceExisting === false) {
      const existingData = await readUserData(sanitizedUser);
      
      // Merge books (avoid duplicates based on id)
      const existingBookIds = new Set(existingData.books.map(book => book.id));
      const newBooks = userData.books.filter(book => !existingBookIds.has(book.id));
      finalData = {
        metadata: userData.metadata.username === sanitizedUser ? userData.metadata : existingData.metadata,
        books: [...existingData.books, ...newBooks],
        collections: [...existingData.collections, ...userData.collections]
      };
    } else {
      // Replace existing data
      finalData = {
        metadata: {
          username: sanitizedUser,
          icon: userData.metadata.icon || '📚'
        },
        books: userData.books || [],
        collections: userData.collections || []
      };
    }
    
    // Write the data
    const dataFile = getUserDataFile(sanitizedUser);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify(finalData, null, 2), 'utf8');
    
    res.status(200).json({
      success: true,
      message: replaceExisting === false ? 'User data merged successfully' : 'User data imported successfully',
      booksCount: finalData.books.length,
      collectionsCount: finalData.collections.length
    });
  } catch (error) {
    console.error('Error importing user data:', error);
    res.status(500).json({ error: 'Failed to import user data', details: error.message });
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
      imageUrl,
      owned
    } = req.body;
    
    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }

    // Validate status
    const validStatuses = ['to read', 'reading', 'finished', 'on hold', 'abandoned'];
    const bookStatus = status && validStatuses.includes(status) ? status : 'to read';

    // Validate owned
    const validOwned = ['not owned', 'physical', 'digital', 'loaned'];
    const bookOwned = owned && validOwned.includes(owned) ? owned : null;

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
      imageUrl: imageUrl || null,
      owned: bookOwned
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

// GET /api/collections - Get all collections for a user
app.get('/api/collections', async (req, res) => {
  try {
    const user = req.query.user || DEFAULT_USER;
    const collections = await readCollections(user);
    res.json(collections);
  } catch (error) {
    console.error('Error getting collections:', error);
    res.status(500).json({ error: 'Failed to retrieve collections' });
  }
});

// POST /api/collections - Create a new collection
app.post('/api/collections', async (req, res) => {
  try {
    const user = req.query.user || req.body.user || DEFAULT_USER;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Collection name is required' });
    }

    const collections = await readCollections(user);
    const newCollection = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      name: name.trim(),
      bookIds: [],
      createdDate: new Date().toISOString()
    };

    collections.push(newCollection);
    const success = await writeCollections(user, collections);
    
    if (success) {
      res.status(201).json(newCollection);
    } else {
      res.status(500).json({ error: 'Failed to save collection' });
    }
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

// PUT /api/collections/:id - Update a collection
app.put('/api/collections/:id', async (req, res) => {
  try {
    const user = req.query.user || req.body.user || DEFAULT_USER;
    const { id } = req.params;
    const updates = req.body;

    const collections = await readCollections(user);
    const index = collections.findIndex(collection => collection.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Only allow updating name, preserve bookIds and createdDate
    if (updates.name) {
      collections[index].name = updates.name.trim();
    }

    const success = await writeCollections(user, collections);

    if (success) {
      res.json(collections[index]);
    } else {
      res.status(500).json({ error: 'Failed to update collection' });
    }
  } catch (error) {
    console.error('Error updating collection:', error);
    res.status(500).json({ error: 'Failed to update collection' });
  }
});

// DELETE /api/collections/:id - Delete a collection
app.delete('/api/collections/:id', async (req, res) => {
  try {
    const user = req.query.user || DEFAULT_USER;
    const { id } = req.params;

    const collections = await readCollections(user);
    const filteredCollections = collections.filter(collection => collection.id !== id);

    if (collections.length === filteredCollections.length) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const success = await writeCollections(user, filteredCollections);

    if (success) {
      res.status(204).send();
    } else {
      res.status(500).json({ error: 'Failed to delete collection' });
    }
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

// POST /api/collections/:id/books - Add a book to a collection
app.post('/api/collections/:id/books', async (req, res) => {
  try {
    const user = req.query.user || req.body.user || DEFAULT_USER;
    const { id } = req.params;
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ error: 'Book ID is required' });
    }

    const collections = await readCollections(user);
    const collection = collections.find(c => c.id === id);

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Check if book already in collection
    if (collection.bookIds.includes(bookId)) {
      return res.status(400).json({ error: 'Book already in collection' });
    }

    collection.bookIds.push(bookId);
    const success = await writeCollections(user, collections);

    if (success) {
      res.json(collection);
    } else {
      res.status(500).json({ error: 'Failed to add book to collection' });
    }
  } catch (error) {
    console.error('Error adding book to collection:', error);
    res.status(500).json({ error: 'Failed to add book to collection' });
  }
});

// DELETE /api/collections/:id/books/:bookId - Remove a book from a collection
app.delete('/api/collections/:id/books/:bookId', async (req, res) => {
  try {
    const user = req.query.user || DEFAULT_USER;
    const { id, bookId } = req.params;

    const collections = await readCollections(user);
    const collection = collections.find(c => c.id === id);

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const index = collection.bookIds.indexOf(bookId);
    if (index === -1) {
      return res.status(404).json({ error: 'Book not found in collection' });
    }

    collection.bookIds.splice(index, 1);
    const success = await writeCollections(user, collections);

    if (success) {
      res.json(collection);
    } else {
      res.status(500).json({ error: 'Failed to remove book from collection' });
    }
  } catch (error) {
    console.error('Error removing book from collection:', error);
    res.status(500).json({ error: 'Failed to remove book from collection' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
async function startServer() {
  try {
    // Ensure data directory exists before starting server
    await ensureDataDirectory();
    
    app.listen(PORT, () => {
      console.log(`\n✓ Server is running on http://localhost:${PORT}`);
      console.log(`✓ Data directory: ${DATA_DIR}\n`);
    });
  } catch (error) {
    console.error('\n✗ Failed to start server:', error);
    console.error('  Please check that the data directory can be created and is writable.');
    process.exit(1); // Exit with error code
  }
}

startServer().catch(console.error);
