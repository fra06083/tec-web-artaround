const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth.js');
const { hasMuseumAccess } = require('../middleware/museumAccess.js');
const { item: Item } = require('../models/museums.js');
const artworkCtrl = require('../controllers/artworkController.js');

const isEditor = authorize(['admin', 'editor']);
const canManageTours = authorize(['admin', 'editor', 'docente']);

// GET /api/artworks/museum/:museumId - Opere di un museo (deve venire prima di :id)
router.get('/museum/:museumId', auth, canManageTours, hasMuseumAccess, artworkCtrl.getArtworksByMuseum);

// GET /api/artworks - Tutte le opere (solo editor)
router.get('/', auth, isEditor, artworkCtrl.getAllArtworks);

// GET /api/artworks/:id - Opera specifica
router.get('/:id', auth, isEditor, artworkCtrl.getArtworkById);

// GET /api/artworks/:id/descriptions
router.get('/:id/descriptions', artworkCtrl.getDescriptionsByArtwork);

// POST /api/artworks - Crea nuova opera
router.post('/', auth, isEditor, hasMuseumAccess, artworkCtrl.createArtwork);

// PUT /api/artworks/:id - Modifica opera
router.put('/:id', auth, isEditor, artworkCtrl.updateArtwork);

// DELETE /api/artworks/:id - Elimina opera
router.delete('/:id', auth, isEditor, artworkCtrl.deleteArtwork);

module.exports = router;
