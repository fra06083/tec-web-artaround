const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth.js');
const museumCtrl = require('../controllers/museumController.js');

const isAdmin = authorize(["admin"]);
const isEditor = authorize(['admin', 'editor']);

// La creazione e cancellazione del museo è riservata agli admin, l'aggiornamento è consentito anche agli editor assegnati
router.post("/", auth, isAdmin, museumCtrl.createMuseum);
router.get('/:id', museumCtrl.getMuseumById);
router.delete('/:id', auth, isAdmin, museumCtrl.deleteMuseum);
router.put('/:id', auth, isEditor, museumCtrl.updateMuseum);

// Restituisce l'elenco dei musei filtrato in base al ruolo dell'utente loggato
router.get("/", auth, authorize(['admin', 'editor', 'docente']), museumCtrl.getAllMuseums);

module.exports = router;
