const login = require('../models/admin.js');
const mongoose = require('mongoose');

// Middleware per verificare se l'utente ha accesso a un museo specifico
const hasMuseumAccess = async (req, res, next) => {
    const museumId = req.params.museumId || req.body.museum_id || req.params.id;

    if (!museumId) {
        return res.status(400).json({ error: 'ID museo mancante' });
    }

    // Gli admin hanno accesso a tutti i musei
    if (req.user.permissions === 'admin') {
        return next();
    }

    // Per editor/autore: verifica che il museo sia nella lista museums dell'utente
    const userMuseums = req.user.museums || [];

    // Se l'utente non ha musei assegnati, negato
    if (userMuseums.length === 0) {
        return res.status(403).json({ error: 'Non hai accesso a nessun museo. Contatta un amministratore.' });
    }

    // Converti museumId in ObjectId per il confronto
    const museumObjectId = new mongoose.Types.ObjectId(museumId);

    // Verifica che il museo sia nella lista (confronto corretto tra ObjectId)
    const hasAccess = userMuseums.some(museumId =>
        museumId.toString() === museumObjectId.toString()
    );

    if (!hasAccess) {
        return res.status(403).json({ error: 'Non hai accesso a questo museo' });
    }

    next();
};

module.exports = { hasMuseumAccess };
