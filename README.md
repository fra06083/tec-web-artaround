# ArtAround Project

This is a web application built with a Node.js backend and a mixed frontend (vanilla HTML/JS for the editor and a React app for the navigator). It uses the MVC (Model-View-Controller) structure to keep everything organized.

## Project Structure

```text
public/                 # files sent directly to the browser
├── css/                # stylesheets
├── js/                 # frontend javascript files
├── images/             # pictures and user uploads (profile pics)
├── editor-marketplace/ # the marketplace frontend pages
└── navigator/          # the React frontend build folder

backend/                # server-side code
├── models/             # Mongoose database schemas
├── middleware/         # functions that check if a user is logged in
├── controllers/        # handles the logic of the app
├── routes/             # connects URLs to the right controller
├── views/              # protected HTML pages for the admin dashboard
├── index.js            # starts the server and connects to the database
└── .env                # passwords and secrets (never uploaded to github)
```

## Application Flow

### The Backend
- **Models:** Define what a user, tour, or museum looks like in the MongoDB database.
- **Middleware:** The `auth.js` middleware checks the JWT token on incoming requests. If the user doesn't have the right permissions, the request is blocked.
- **Controllers:** This is where the code connects the database to the routes. It processes data and decides what to send back.
- **Routes:** Connect URLs to the controllers. For example, the `upload.js` route uses `multer` to save uploaded images to the public folder.
- **Views:** The HTML files for the editor dashboard are kept here instead of the public folder. Express only sends these files to the browser if the middleware confirms the user is an admin or editor.

### Authentication
When a user logs in, the server creates a JWT token that contains their ID, name, and permissions. This token is stored in a cookie that expires after 7 days. 

When the user opens a protected page, the server checks the cookie. If the token is valid, the server sends the HTML file. Once the page loads, the frontend Javascript reads the user data from local storage or from the token to show the correct profile picture and dashboard menus.
