const jwt = require('jsonwebtoken');
const User = require('../models/user.js');

const auth = async (req, res, next) => {
    const token = req.cookies?.artaround_token || req.query.token;

    if (!token) {
        return res.redirect('/login.html');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Popola req.user con i dati completi dell'utente dal database
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.redirect('/login.html');
        }

        req.user = user;
        next();
    } catch (err) {
        res.redirect('/login.html');
    }
};

const optionalAuth = async (req, res, next) => {
    const token = req.cookies?.artaround_token || req.query.token || req.headers.authorization;

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (user) {
            req.user = user;
        }
    } catch (err) {
        // Ignora errori di token scaduto in optionalAuth
    }
    next();
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

module.exports = { auth, optionalAuth, authorize };
