const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, authorize } = require('../middleware/auth.js');

// Configurazione storage Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // La tipologia (museums, artworks, users) è passata come parametro nella rotta
        const type = req.params.type; 
        let dest = path.join(__dirname, '../../public/images/misc');

        if (type === 'museum') {
            dest = path.join(__dirname, '../../public/images/museums');
        } else if (type === 'artwork') {
            dest = path.join(__dirname, '../../public/images/artworks');
        } else if (type === 'user') {
            dest = path.join(__dirname, '../../public/images/users');
        } else if (type === 'visit') {
            dest = path.join(__dirname, '../../public/images/visits');
        }

        // Crea la cartella se non esiste
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: function (req, file, cb) {
        // Nome file univoco
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, req.user.id + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // limite 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Formato non supportato. Solo immagini consentite.'));
        }
    }
});

// POST /api/upload/:type
router.post('/:type', auth, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nessun file caricato' });
        }
        
        const type = req.params.type;
        let folder = 'misc';
        if (type === 'museum') folder = 'museums';
        if (type === 'artwork') folder = 'artworks';
        if (type === 'user') folder = 'users';
        if (type === 'visit') folder = 'visits';

        // URL pubblico da restituire (relativo alla directory public)
        const imageUrl = `/images/${folder}/${req.file.filename}`;
        
        res.status(200).json({ 
            message: 'Upload completato con successo', 
            url: imageUrl 
        });
    } catch (error) {
        console.error('Errore durante l\'upload:', error);
        res.status(500).json({ error: 'Errore interno durante l\'upload' });
    }
});

module.exports = router;
