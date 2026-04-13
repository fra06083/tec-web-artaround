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

module.exports = auth;
