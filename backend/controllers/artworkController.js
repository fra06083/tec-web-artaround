const { item: Item, language: Language } = require('../models/museums.js');

// GET /api/artworks
const getAllArtworks = async (req, res) => {
    try {
        const artworks = await Item.find().populate('museum_id', 'museum city').lean();
        res.json(artworks);
    } catch (error) {
        console.error('Errore nel recupero delle opere:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/artworks/:id
const getArtworkById = async (req, res) => {
    try {
        const artwork = await Item.findById(req.params.id).populate('museum_id').lean();
        if (!artwork) return res.status(404).json({ error: 'Opera non trovata' });
        res.json(artwork);
    } catch (error) {
        console.error('Errore nel recupero dell\'opera:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/museums/:museumId/artworks
const getArtworksByMuseum = async (req, res) => {
    try {
        const artworks = await Item.find({ museum_id: req.params.museumId }).lean();
        res.json(artworks);
    } catch (error) {
        console.error('Errore nel recupero delle opere del museo:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/artworks
const createArtwork = async (req, res) => {
    try {
        const { item, img_path, museum_id, author, license, description, desc_type } = req.body;

        // for the moment the description is mandatory..
        if (!item || !img_path || !museum_id || !author || !license || !description) {
            return res.status(400).json({
                error: 'Campi obbligatori mancanti: item, img_path, museum_id, author, license'
            });
        }

        const newArtwork = new Item({
            item,
            img_path,
            museum_id,
            author,
            license
        });
        await newArtwork.save();
        res.status(201).json({ message: 'Opera creata con successo', artwork: newArtwork });

        const newLanguage = new Language({
            // default
            type: desc_type || 'medio',
            text: description,
            // this actually needs to a time selected by the user
            length: description.length.toString(),
            item_id: newArtwork._id
        });
        await newLanguage.save();

    } catch (error) {
        console.error('Errore nella creazione dell\'opera:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Nome opera già esistente' });
        }
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PUT /api/artworks/:id
const updateArtwork = async (req, res) => {
    try {
        const { item, img_path, museum_id, author, license, description, desc_type } = req.body;

        const updated = await Item.findByIdAndUpdate(
            req.params.id,
            { $set: { item, img_path, museum_id, author, license } },
            { returnDocument: 'after', runValidators: true }
        );

        await Language.findOneAndUpdate(
            { item_id: req.params.id },
            { $set: {
                text: description,
                length: description.length.toString(),
                type: desc_type || 'medio'
            }},
            { upsert: true }
        );

        if (!updated) return res.status(404).json({ error: 'Opera non trovata' });
        res.json({ message: 'Opera aggiornata', artwork: updated });
    } catch (error) {
        console.error('Errore nell\'aggiornamento dell\'opera:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Nome opera già esistente' });
        }
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// DELETE /api/artworks/:id
const deleteArtwork = async (req, res) => {
    try {
        const deleted = await Item.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Opera non trovata' });
        res.json({ message: 'Opera eliminata con successo' });
    } catch (error) {
        console.error('Errore nell\'eliminazione dell\'opera:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = {
    getAllArtworks,
    getArtworkById,
    getArtworksByMuseum,
    createArtwork,
    updateArtwork,
    deleteArtwork
};
