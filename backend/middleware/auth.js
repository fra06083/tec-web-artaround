const jwt = require('jsonwebtoken'); // used for token verification

const auth = (req, res, next) => {
    // used for extracting the token from cookies or URL
    const token = req.cookies?.artaround_token || req.query.token;

    if (!token) {
        // used for blocking unauthorized access
        return res.redirect('/login.html');
    }

    try {
        // used for verifying if the token is valid and not expired
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // stores user data in the request object
        next();             // used for moving to the next function (controller)
    } catch (err) {
        // used for handling invalid tokens
        res.redirect('/login.html');
    }
};
// Middleware per controllare i ruoli di admin e editor
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            // Se l'utente non ha il ruolo necessario, restituiamo un errore 403 (Forbidden)
            return res.status(403).send("Accesso negato: permessi insufficienti.");
        }
        next(); // L'utente ha il ruolo giusto
    };
};

module.exports = { auth, authorize };
