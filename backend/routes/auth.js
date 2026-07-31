const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user'); // user models

// Rotta per il login
router.post('/login', async (req, res) => {
    try {
        const { name, password } = req.body;
        const user = await User.findOne({ name });
        if (!user) return res.status(401).json({ error: 'Credenziali non valide' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Credenziali non valide' });

        // create a JSON Web Token (JWT) so the user doesn't have to log in on every request
        // we embed the roles and museums inside the payload so the frontend can read them instantly
        const token = jwt.sign(
            { id: user._id, name: user.name, permissions: user.permissions, museums: user.museums },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // keep the user logged in for 7 days
        );
        res.cookie('artaround_token', token, {
            httpOnly: true,
            secure: false,  // Metti true solo se hai HTTPS
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        });

        res.json({ 
            message: "Login ok", 
            token,
            user: {
                id: user._id,
                name: user.name,
                permissions: user.permissions,
                propic: user.propic,
                purchased_visits: user.purchased_visits,
                museums: user.museums
            }
        });
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
        const existingUser = await User.findOne({ name });
        if (existingUser) {
            return res.status(400).json({ error: 'Nome utente già in uso' });
        }

        // HASHING
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new User({
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
router.post('/check', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('name permissions propic purchased_visits museums');
        if (!user) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }
        res.json({ valid: true, user: { 
            id: user._id, 
            name: user.name, 
            permissions: user.permissions, 
            propic: user.propic,
            museums: user.museums,
            purchased_visits: user.purchased_visits 
        } });
    } catch (error) {
        res.status(500).json({ error: 'Errore interno' });
    }
});

// Modifica Profilo Utente
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, propic } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Il nome è obbligatorio' });
        }

        // Verifica che il nome non sia usato da altri (se è cambiato)
        if (name !== req.user.name) {
            const existingUser = await User.findOne({ name });
            if (existingUser && existingUser._id.toString() !== userId) {
                return res.status(400).json({ error: 'Nome utente già in uso' });
            }
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { name, propic: propic || "" },
            { new: true }
        );

        res.json({ message: 'Profilo aggiornato con successo', user: {
            id: user._id,
            name: user.name,
            propic: user.propic
        }});
    } catch (error) {
        console.error("Errore aggiornamento profilo:", error);
        res.status(500).json({ error: 'Errore interno' });
    }
});

router.get('/my-visits', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).populate({
            path: 'purchased_visits',
            populate: { path: 'museum_id', select: 'museum province' }
        });
        
        if (!user) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }
        
        res.json(user.purchased_visits || []);
    } catch (error) {
        console.error('Errore recupero my-visits:', error);
        res.status(500).json({ error: 'Errore interno' });
    }
});

// Rotta per checkout carrello
router.post('/buy', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { visits } = req.body; // array of visit IDs

        if (!visits || !Array.isArray(visits)) {
            return res.status(400).json({ error: 'Nessuna visita fornita' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }

        // Aggiungi le visite al vettore purchased_visits (evitando duplicati se desiderato, o permettendoli)
        // Usiamo $addToSet per evitare duplicati
        await User.findByIdAndUpdate(userId, {
            $addToSet: { purchased_visits: { $each: visits } }
        });

        res.json({ message: 'Acquisto completato con successo!' });
    } catch (error) {
        console.error("Errore durante l'acquisto:", error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// Export for index.js
module.exports = router;
