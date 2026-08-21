const express = require('express');
const router = express.Router();
const { auth, optionalAuth } = require('../middleware/auth.js');
const visitsCtrl = require('../controllers/visitsController.js');

// Consultazione catalogo visite (optionalAuth permette l'accesso sia da visitatori anonimi che loggati)
router.get('/', optionalAuth, visitsCtrl.getAllVisits);
router.get('/:id', optionalAuth, visitsCtrl.getVisitById);

// Gestione CRUD della scheda visita
router.post('/', auth, visitsCtrl.createVisit);
router.put('/:id', auth, visitsCtrl.updateVisit);
router.delete('/:id', auth, visitsCtrl.deleteVisit);

// Gestione delle opere incluse nella visita
router.get('/:id/items', visitsCtrl.getItemsByVisit);
router.post('/:id/items', auth, visitsCtrl.addItemToVisit);
router.delete('/:id/items/:itemId', auth, visitsCtrl.removeItemFromVisit);

// Gestione del quiz di fine visita
router.get('/:id/quiz', visitsCtrl.getQuizByVisit);
router.post('/:id/quiz', auth, visitsCtrl.addQuizQuestion);
router.put('/:id/quiz/:questionId', auth, visitsCtrl.updateQuizQuestion);
router.delete('/:id/quiz/:questionId', auth, visitsCtrl.removeQuizQuestion);

module.exports = router;