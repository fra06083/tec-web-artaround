# ArtAround Backend Architecture

This project follows the **MVC (Model-View-Controller)** pattern to ensure a clean separation between data, logic, and presentation.

---

## Project Structure

```
public/             # used for: public static files (CSS, client-side JS, images)
├── css/            # used for: global styles
├── js/             # used for: frontend logic (Alpine.js, fetch calls)
└── marketplace/    # used for: public pages (index, login, signup)
backend/
├── models/      # used for: defining Mongoose schemas and database structure
├── middleware/  # used for: protecting routes and verifying JWT tokens (The Guard)
├── controllers/ # used for: business logic, data processing, and responses (The Brain)
├── routes/      # used for: mapping URLs to specific controller functions (The Map)
├── views/       # used for: storing protected HTML files for the editor (The Vault)
├── index.js     # used for: server configuration and database connection
└── .env         # used for: storing environment variables and secrets
```

---

## Components Detail

### 1. Models (`models/`)

**Used for:** defining the structure of MongoDB documents.

Example:  
`museums.js` handles schemas for visits and items.

---

### 2. Middleware (`middleware/`)

**Used for:** intercepting requests before they reach the controller.

File:  
`auth.js` checks for a valid JWT in cookies or URL parameters.

---

### 3. Controllers (`controllers/`)

**Used for:** the actual "intelligence" of the application.

Logic:

- Fetches data from **Models**
- Processes business logic
- Chooses which **View (HTML)** or **JSON** data to return

---

### 4. Routes (`routes/`)

**Used for:** defining the API and View endpoints.

Example:  
`admin.js` connects `/admin/stats` to the `getStats` function in the controller.

---

### 5. Views (`views/`)

**Used for:** keeping admin-only HTML files safe and hidden from the public.

Security:
These files are only served via `res.sendFile()` after a successful authentication check.

---

## Core Files

### `index.js`

Used for:

- Main entry point of the Node.js application
- Connecting to MongoDB
- Initializing Express middleware (CORS, JSON parsing, Cookies)
- Serving the `/public` folder for static assets

---

### `.env`

Used for storing sensitive credentials such as:

- `MONGO_PWD`
- `JWT_SECRET`

Note:  
This file is ignored by Git for security reasons.

---

## Workflow Example

1. User clicks a link to `/editor/tours`.
2. **Middleware (`auth.js`)** verifies the identity.
3. **Route (`admin.js`)** triggers the correct controller function.
4. **Controller (`adminController.js`)** sends the protected HTML from the `views/` folder.
5. The browser receives the HTML and fetches CSS/JS from the `/public` directory.
