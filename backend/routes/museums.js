
const express = require('express');
const router = express.Router();             // used for creating modular route handlers
const auth = require('../middleware/auth.js'); // used for protecting routes
const museumCtrl = require('../controllers/museumController.js'); // used for logici

// CREATE NEW MUSEUM (protected)
router.post("/", auth, museumCtrl.createMuseum);
// GET MUSEUM (PROTECTED)
router.get("/", auth, museumCtrl.getAllMuseums);
module.exports = router;
