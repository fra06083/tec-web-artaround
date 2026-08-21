const User = require('../models/user.js');
const mongoose = require('mongoose');

const hasMuseumAccess = async (req, res, next) => {
    const museumId = req.params.museumId || req.body.museum_id || req.params.id;

    if (!museumId) {
        return res.status(400).json({ error: 'ID museo mancante' });
    }

    if (req.user.permissions === 'admin') {
        return next();
    }

    const userMuseums = req.user.museums || [];

    if (userMuseums.length === 0) {
        return res.status(403).json({ error: 'Non hai accesso a nessun museo. Contatta un amministratore.' });
    }

    const museumObjectId = new mongoose.Types.ObjectId(museumId);

    // confronto tra stringhe degli objectid per evitare mismatch di tipo mongo
    const hasAccess = userMuseums.some(museumId =>
        museumId.toString() === museumObjectId.toString()
    );

    if (!hasAccess) {
        return res.status(403).json({ error: 'Non hai accesso a questo museo' });
    }

    next();
};

module.exports = { hasMuseumAccess };
