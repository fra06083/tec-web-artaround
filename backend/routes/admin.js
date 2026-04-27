const express = require('express');
const router = express.Router();             // used for creating modular route handlers
const auth = require('../middleware/auth.js'); // used for protecting routes
const adminCtrl = require('../controllers/adminController.js'); // used for logic

// GET /editor/dashboard -> used for viewing the admin panel
router.get('/dashboard', auth, adminCtrl.serveDashboard);

// GET /editor/stats -> used for fetching dashboard numbers
router.get('/stats', auth, adminCtrl.getStats);

// GET /editor/tours -> used for fetching the list of tours
router.get('/getTours', auth, adminCtrl.getAllTours);
router.get('/tours', auth, adminCtrl.serveTours);
router.get('/museum', auth, adminCtrl.serveMuseums);
router.get("/artworks", auth, adminCtrl.serveArtworks);
module.exports = router; // used for exporting the router to app.js
