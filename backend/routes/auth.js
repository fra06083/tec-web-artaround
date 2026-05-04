const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const login = require('../models/admin'); // admin models

// Rotta per il login
router.post('/login', async (req, res) => {
    try {
        const { name, password } = req.body;
        const user = await login.findOne({ name });
        if (!user) return res.status(401).json({ error: 'Credenziali non valide' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Credenziali non valide' });

        const token = jwt.sign(
            { id: user._id, name: user.name, permissions: user.permissions, museums: user.museums },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );
        res.cookie('artaround_token', token, {
            httpOnly: true,
            secure: false,  // Metti true solo se hai HTTPS
            sameSite: 'lax',
            maxAge: 4 * 60 * 60 * 1000 // Scade tra 4 ore
        });

        res.json({ message: "Login ok", token });
    } catch (error) {
        res.status(500).json({ error: 'Errore interno' });
    }
});

router.post('/register', async (req, res) => {
    try {
        console.log("PRESA IN GESTIONE RICHIESTA REGISTRAZIONE");

        // FORM DATAS
        const { name, password } = req.body;

        // CHECK IF NULL
        if (!name || !password) {
            return res.status(400).json({ error: 'Nome e password sono obbligatori' });
        }

        // CHECK EXISTING USER (NOT OVERWRITE)
        const existingUser = await login.findOne({ name });
        if (existingUser) {
            return res.status(400).json({ error: 'Nome utente già in uso' });
        }

        // HASHING
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new login({
            name: name,
            password: hashedPassword,
            permissions: 'visitatore' // always check visitatore, if we let choose the role we might have security problems!
        });

        await newUser.save();
        res.status(201).json({ message: 'Registrazione completata!' });

    } catch (error) {
        console.error("Errore nella registrazione:", error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// MIDDLEWARE AUTH
const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ error: 'Accesso negato. Token mancante.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // dati dell'utente nella richiesta
        next(); // Passiamo al prossimo passaggio (la rotta vera e propria)
    } catch (error) {
        res.status(403).json({ error: 'Token non valido o scaduto.' });
    }
};
router.post('/check', authenticateToken, (req, res) => {
    const token = req.headers.authorization; if (!token) {
        return res.status(401).json({ error: 'Nessun token fornito' });
    }

    try {
        // Decodifichiamo direttamente la stringa passata
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
        res.json({ valid: true, user: decoded });
    } catch (error) {
        res.status(401).json({ error: 'Token non valido o scaduto' });
    }
});

// Export for index.js
module.exports = router;
