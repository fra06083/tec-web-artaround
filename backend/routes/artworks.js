const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth.js');
const { hasMuseumAccess } = require('../middleware/museumAccess.js');
const { item: Item } = require('../models/museums.js');
const artworkCtrl = require('../controllers/artworkController.js');

const isEditor = authorize(['admin', 'editor']);
const canManageTours = authorize(['admin', 'editor', 'docente']);

// Rotta per recuperare le opere di un museo specifico (la rotta /museum/ va messa prima di /:id per evitare che Express la interpreti come un ID)
router.get('/museum/:museumId', auth, canManageTours, hasMuseumAccess, artworkCtrl.getArtworksByMuseum);
router.get('/', auth, isEditor, artworkCtrl.getAllArtworks);

// Rotta pubblica leggera utilizzata dall'app visitatore senza richiesta di token JWT
router.get('/public/museum/:museumId', async (req, res) => {
    try {
        const artworks = await Item.find({ museum_id: req.params.museumId })
            .select('item img_path sala')
            .lean();
        res.json(artworks);
    } catch (error) {
        console.error('Errore nel recupero delle opere pubbliche:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// CRUD opere d'arte per la dashboard di editing
router.get('/:id', auth, isEditor, artworkCtrl.getArtworkById);
router.get('/:id/descriptions', artworkCtrl.getDescriptionsByArtwork);
router.post('/', auth, isEditor, hasMuseumAccess, artworkCtrl.createArtwork);
router.put('/:id', auth, isEditor, artworkCtrl.updateArtwork);
router.delete('/:id', auth, isEditor, artworkCtrl.deleteArtwork);

module.exports = router;
