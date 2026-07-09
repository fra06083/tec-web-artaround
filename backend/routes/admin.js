const express = require('express');
const router = express.Router();             // used for creating modular route handlers
const { auth, authorize } = require('../middleware/auth.js'); // used for protecting routes
const adminCtrl = require('../controllers/adminController.js'); // used for logic

const isStaff = authorize(['admin', 'editor', 'docente']);
const isEditor = authorize(['admin', 'editor']);
const isAdmin = authorize(['admin']);
// GET /editor/dashboard -> used for viewing the admin panel
router.get('/dashboard', auth, isStaff, adminCtrl.serveDashboard);

// GET /editor/stats -> used for fetching dashboard numbers
router.get('/stats', auth, isAdmin, adminCtrl.getStats);

// GET /editor/tours -> used for fetching the list of tours
router.get('/getTours', auth, isEditor, adminCtrl.getAllTours);
router.get('/tours', auth, isStaff, adminCtrl.serveTours);
router.get('/museum', auth, isEditor, adminCtrl.serveMuseums);
router.get("/artworks", auth, isEditor, adminCtrl.serveArtworks);
router.get("/import", auth, isAdmin, adminCtrl.serveImporter);
module.exports = router; // used for exporting the router to app.js
