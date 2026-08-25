const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/userManagementController');
const adminCtrl = require('../controllers/adminController');
const { auth, authorize } = require('../middleware/auth');
const isAdmin = authorize(["admin"]);

// Pagina di amministrazione utenti (riservata agli amministratori)
router.get('/', auth, isAdmin, adminCtrl.serveUsersManagement);

// API REST per la gestione di ruoli, credenziali e permessi museali
router.get('/search', auth, isAdmin, userCtrl.searchUsers);
router.get('/:id', auth, isAdmin, userCtrl.getUserById);
router.put('/:id/role', auth, isAdmin, userCtrl.updateUserRole);
router.put('/:id/name', auth, isAdmin, userCtrl.updateUserName);
router.put('/:id/password', auth, isAdmin, userCtrl.updateUserPassword);
router.post('/:id/museums/:museumId', auth, isAdmin, userCtrl.grantMuseumPermission);
router.delete('/:id/museums/:museumId', auth, isAdmin, userCtrl.revokeMuseumPermission);
router.delete('/:id', auth, isAdmin, userCtrl.deleteUser);

module.exports = router;
