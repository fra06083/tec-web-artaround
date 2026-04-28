const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/userManagementController');
const adminCtrl = require('../controllers/adminController');
const auth = require('../middleware/auth'); // Il guardiano

// Pagina HTML (Protetta: solo chi è loggato può vederla)
router.get('/', auth, adminCtrl.serveUsersManagement);

// API per il frontend (Alpine.js)
router.get('/search', auth, userCtrl.searchUsers);
router.get('/:id', auth, userCtrl.getUserById);
router.post('/:id/museums/:museumId', auth, userCtrl.grantMuseumPermission);
router.delete('/:id/museums/:museumId', auth, userCtrl.revokeMuseumPermission);

module.exports = router;
