const { museum: Museum, item: Item, visit: Visit } = require('../models/museums');
// GET /api/museums
// Ritorna tutti i musei o solo quelli assegnati al docente
const getAllMuseums = async (req, res) => {
    try {
        let museums;
        if (req.user.permissions === 'docente') {
            const userWithMuseums = await require('../models/user.js').findById(req.user._id).populate('museums').lean();
            museums = userWithMuseums.museums || [];
        } else {
            museums = await Museum.find().lean();
        }
        res.json(museums);
    } catch (error) {
        console.error('Errore nel recupero dei musei:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/museums/:id
const getMuseumById = async (req, res) => {
    try {
        const museum = await Museum.findById(req.params.id).lean();
        if (!museum) return res.status(404).json({ error: 'Museo non trovato' });
        res.json(museum);
    } catch (error) {
        console.error('Errore nel recupero del museo:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/museums
// Richiede Auth (il middleware va nella rotta)
const createMuseum = async (req, res) => {
    try {
        const { museum, city, province, region, address, description, image } = req.body;

        if (!museum) {
            return res.status(400).json({ error: 'Il nome del museo è obbligatorio' });
        }

        const existingMuseum = await Museum.findOne({ museum });
        if (existingMuseum) {
            return res.status(409).json({ error: 'Un museo con questo nome è già presente' });
        }

        const newMuseum = new Museum({
            museum,
            city,
            province,
            region,
            address,
            description,
            image
        });

        await newMuseum.save();
        res.status(201).json({ message: 'Museo creato con successo', museum: newMuseum });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Dati incompleti o non validi' });
        }
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Elemento già presente (duplicato)' });
        }
        console.error('Errore nella creazione del museo:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PUT /api/museums/:id
const updateMuseum = async (req, res) => {
    try {
        const { museum, city, province, region, address, description, image } = req.body;

        if (museum) {
            const existingMuseum = await Museum.findOne({ museum, _id: { $ne: req.params.id } });
            if (existingMuseum) {
                return res.status(409).json({ error: 'Un museo con questo nome è già presente' });
            }
        }

        const updated = await Museum.findByIdAndUpdate(
            req.params.id,
            { $set: { museum, city, province, region, address, description, image } },
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ error: 'Museo non trovato' });
        res.json({ message: 'Museo aggiornato', museum: updated });
    } catch (error) {
        console.error('Errore nell\'aggiornamento del museo:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// DELETE /api/museums/:id
const deleteMuseum = async (req, res) => {
    try {
        const deleted = await Museum.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Museo non trovato' });

        // visite e item inerenti a quel museo devono essere cancellati
        await Visit.deleteMany({ museum_id: req.params.id });
        await Item.deleteMany({ museum_id: req.params.id });

        res.json({ message: 'Museo eliminato con successo' });
    } catch (error) {
        console.error('Errore nell\'eliminazione del museo:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

/* =========================================================
   GESTIONE OPERE (ITEMS) ASSOCIATE AL MUSEO
========================================================= */

// GET /api/museums/:id/artworks
// Recupera tutte le opere che appartengono a un determinato museo
const getArtworksByMuseum = async (req, res) => {
    try {
        // Assumiamo che nel modello Item ci sia un campo museum_id
        const artworks = await Item.find({ museum_id: req.params.id }).lean();
        res.json(artworks);
    } catch (error) {
        console.error('Errore nel recupero delle opere:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/artworks
// Crea una nuova opera associata a un museo
const createArtwork = async (req, res) => {
    try {
        const { title, artist, image, museum_id, description } = req.body;

        if (!title || !museum_id) {
            return res.status(400).json({ error: 'Titolo e ID Museo sono obbligatori' });
        }

        const newArtwork = new Item({
            title,
            artist,
            image,
            museum_id,
            description
        });

        await newArtwork.save();
        res.status(201).json({ message: 'Opera creata con successo', artwork: newArtwork });
    } catch (error) {
        console.error('Errore nella creazione dell\'opera:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = {
    getAllMuseums,
    getMuseumById,
    createMuseum,
    updateMuseum,
    deleteMuseum,
    getArtworksByMuseum,
    createArtwork
};
