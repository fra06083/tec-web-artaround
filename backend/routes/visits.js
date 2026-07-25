const express = require('express');
const router = express.Router();
const { auth, optionalAuth } = require('../middleware/auth.js');
const visitsCtrl = require('../controllers/visitsController.js');
// ─── MARKETPLACE (public) ────────────────────────────────────────────────────

// GET /api/visite = lista di tutte le visite pubbliche (usata dal marketplace)
router.get('/', optionalAuth, visitsCtrl.getAllVisits);

// GET /api/visite/:id = dettaglio di una singola visita
router.get('/:id', optionalAuth, visitsCtrl.getVisitById);

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

// ─── QUIZ (domande a scelta multipla legate a una visita) ───────────────────

// GET /api/visite/:id/quiz = lista domande della visita (pubblica: serve al Navigator per erogare il quiz)
router.get('/:id/quiz', visitsCtrl.getQuizByVisit);

// POST /api/visite/:id/quiz = aggiunge una domanda alla visita (solo docente/editor autenticato)
router.post('/:id/quiz', auth, visitsCtrl.addQuizQuestion);

// PUT /api/visite/:id/quiz/:questionId = modifica una domanda
router.put('/:id/quiz/:questionId', auth, visitsCtrl.updateQuizQuestion);

// DELETE /api/visite/:id/quiz/:questionId = rimuove una domanda
router.delete('/:id/quiz/:questionId', auth, visitsCtrl.removeQuizQuestion);

module.exports = router;