const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/userManagementController');
const adminCtrl = require('../controllers/adminController');
const { auth, authorize } = require('../middleware/auth'); // Il guardiano
const isAdmin = authorize(["admin"]);
// Pagina HTML (Protetta: solo chi è loggato può vederla)
router.get('/', auth, isAdmin, adminCtrl.serveUsersManagement);

// API per il frontend (Alpine.js)
router.get('/search', auth, isAdmin, userCtrl.searchUsers);
router.get('/:id', auth, isAdmin, userCtrl.getUserById);
router.post('/:id/museums/:museumId', auth, isAdmin, userCtrl.grantMuseumPermission);
router.delete('/:id/museums/:museumId', auth, isAdmin, userCtrl.revokeMuseumPermission);
router.delete('/:id', auth, isAdmin, userCtrl.deleteUser);

module.exports = router;
