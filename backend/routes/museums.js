
const express = require('express');
const router = express.Router();             // used for creating modular route handlers
const auth = require('../middleware/auth.js'); // used for protecting routes
const museumCtrl = require('../controllers/museumController.js'); // used for logici

// CREATE NEW MUSEUM (protected)
router.post("/", auth, museumCtrl.createMuseum);
// GET MUSEUM BY ID
router.get('/:id', museumCtrl.getMuseumById);

// DELETE MUSEUM (PROTECTED!)
router.delete('/:id', auth, museumCtrl.deleteMuseum);
// EDIT MUSEUM (PROTECTED!)
router.put('/:id', auth, museumCtrl.updateMuseum);




// GET MUSEUM (PROTECTED)
router.get("/", auth, museumCtrl.getAllMuseums);
module.exports = router;
