
const express = require('express');
const router = express.Router();             // used for creating modular route handlers
const { auth, authorize } = require('../middleware/auth.js'); // used for protecting routes
const museumCtrl = require('../controllers/museumController.js'); // used for logici
const isAdmin = authorize(["admin"]);
const isEditor = authorize(['admin', 'editor']);
// CREATE NEW MUSEUM (protected)
router.post("/", auth, isAdmin, museumCtrl.createMuseum);
// GET MUSEUM BY ID
router.get('/:id', museumCtrl.getMuseumById);

// DELETE MUSEUM (PROTECTED!)
router.delete('/:id', auth, isAdmin, museumCtrl.deleteMuseum);
// EDIT MUSEUM (PROTECTED!)
router.put('/:id', auth, isEditor, museumCtrl.updateMuseum);




// GET MUSEUM (PROTECTED)
router.get("/", auth, isEditor, museumCtrl.getAllMuseums);
module.exports = router;
