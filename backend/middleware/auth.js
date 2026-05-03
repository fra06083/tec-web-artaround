const jwt = require('jsonwebtoken');
const login = require('../models/admin.js');

const auth = async (req, res, next) => {
    const token = req.cookies?.artaround_token || req.query.token;

    if (!token) {
        return res.redirect('/login.html');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Popola req.user con i dati completi dell'utente dal database
        const user = await login.findById(decoded.id).select('-password');
        if (!user) {
            return res.redirect('/login.html');
        }

        req.user = user;
        next();
    } catch (err) {
        res.redirect('/login.html');
    }
};
// Middleware per controllare i ruoli di admin e editor
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.permissions)) {
            return res.status(403).send("Accesso negato: permessi insufficienti.");
        }
        next();
    };
};

module.exports = { auth, authorize };
