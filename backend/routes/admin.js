const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth.js');
const adminCtrl = require('../controllers/adminController.js');

const isStaff = authorize(['admin', 'editor', 'docente']);
const isEditor = authorize(['admin', 'editor']);
const isAdmin = authorize(['admin']);

router.get('/dashboard', auth, isStaff, adminCtrl.serveDashboard);
router.get('/stats', auth, isStaff, adminCtrl.getStats);
router.get('/getTours', auth, isEditor, adminCtrl.getAllTours);
router.get('/tours', auth, isStaff, adminCtrl.serveTours);
router.get('/museum', auth, isEditor, adminCtrl.serveMuseums);
router.get("/artworks", auth, isEditor, adminCtrl.serveArtworks);
router.get("/import", auth, isAdmin, adminCtrl.serveImporter);

module.exports = router;
