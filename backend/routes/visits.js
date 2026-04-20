const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.js');
const visitsCtrl = require('../controllers/visitsController.js');

// ─── MARKETPLACE (public) ────────────────────────────────────────────────────

// GET /api/visite = lista di tutte le visite pubbliche (usata dal marketplace)
router.get('/', visitsCtrl.getAllVisits);

// GET /api/visite/:id = dettaglio di una singola visita
router.get('/:id', visitsCtrl.getVisitById);

// ─── EDITOR (protected) ──────────────────────────────────────────────────────

// POST /api/visite = crea una nuova visita
router.post('/', auth, visitsCtrl.createVisit);

// PUT /api/visite/:id = aggiorna una visita esistente
router.put('/:id', auth, visitsCtrl.updateVisit);

// DELETE /api/visite/:id = elimina una visita
router.delete('/:id', auth, visitsCtrl.deleteVisit);

// ─── ITEMS (opere dentro una visita) ─────────────────────────────────────────

// GET /api/visite/:id/items = lista degli item di una visita
router.get('/:id/items', visitsCtrl.getItemsByVisit);

// POST /api/visite/:id/items = aggiunge un item a una visita
router.post('/:id/items', auth, visitsCtrl.addItemToVisit);

// DELETE /api/visite/:id/items/:itemId = rimuove un item da una visita
router.delete('/:id/items/:itemId', auth, visitsCtrl.removeItemFromVisit);

module.exports = router;
