const jwt = require('jsonwebtoken');
const User = require('../models/user.js');

const auth = async (req, res, next) => {
    let token = req.cookies?.artaround_token || req.query.token || req.headers.authorization;
    if (token && token.startsWith('Bearer ')) {
        token = token.slice(7);
    }

    if (!token) {
        if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
            return res.status(401).json({ error: "Non autorizzato. Token mancante." });
        }
        return res.redirect('/login.html');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
                return res.status(401).json({ error: "Utente non trovato." });
            }
            return res.redirect('/login.html');
        }

        req.user = user;
        next();
    } catch (err) {
        if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
            return res.status(401).json({ error: "Token non valido o scaduto." });
        }
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
        // token scaduto o non valido, prosegue come anonimo
    }
    next();
};

const authorize = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = (req.user?.permissions || '').toLowerCase();
        const allowed = allowedRoles.map(r => r.toLowerCase());
        if (!req.user || !allowed.includes(userRole)) {
            return res.status(403).send("Accesso negato: permessi insufficienti.");
        }
        next();
    };
};

module.exports = { auth, optionalAuth, authorize };
