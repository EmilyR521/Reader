# Books Reading List

A small Angular application for tracking your reading list with an Express.js backend that automatically manages a JSON file for persistent storage.

## Features

- Add books to your reading list with title and author
- Mark books as read/unread
- Remove books from your list
- View statistics (total, read, unread)
- All data automatically saved to a JSON file on the server
- No manual file operations required - everything is handled automatically

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (comes with Node.js)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start both the Express server and Angular development server:
```bash
npm run dev
```

This will start:
- Express.js server on `http://localhost:3000`
- Angular development server on `http://localhost:4200`

Alternatively, you can run them separately:
```bash
# Terminal 1: Start Express server
npm run server

# Terminal 2: Start Angular dev server
npm start
```

3. Open your browser and navigate to `http://localhost:4200`

### Building for Production

To build the application for production:

```bash
npm run build
```

The built files will be in the `dist/books-reading-list` directory.

### Data Storage

The reading list data is automatically stored in `data/reading-list.json` on the server. The file is created automatically when the server starts and is updated whenever you add, update, or remove books. No manual file operations are needed!

## Project Structure

```
├── server.js                 # Express.js backend server
├── data/                     # Data directory (auto-created)
│   └── reading-list.json     # JSON file storing books
├── src/                      # Angular frontend
│   ├── app/
│   │   ├── reading-list/
│   │   │   ├── reading-list.component.ts
│   │   │   ├── reading-list.component.html
│   │   │   └── reading-list.component.css
│   │   ├── services/
│   │   │   └── reading-list.service.ts
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   ├── app.component.css
│   │   ├── app.module.ts
│   │   └── app-routing.module.ts
│   ├── index.html
│   ├── main.ts
│   └── styles.css
└── proxy.conf.json           # Proxy configuration for dev server
```

## API Endpoints

The Express server provides the following REST API endpoints:

- `GET /api/books` - Get all books
- `POST /api/books` - Add a new book
- `PUT /api/books/:id` - Update a book
- `DELETE /api/books/:id` - Delete a book
- `GET /api/health` - Health check

## Technologies Used

- Angular 17
- TypeScript
- RxJS
- Express.js
- Node.js
- CORS
