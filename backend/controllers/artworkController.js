const { item: Item, language: Language, visit: Visit } = require('../models/museums.js');
const { deleteLocalFile } = require('../utils/fileUtils');

const getAllArtworks = async (req, res) => {
    try {
        let query = {};
        if (req.user && req.user.permissions !== 'admin') {
            const userMuseums = (req.user.museums || []).map(id => id.toString());
            query = { museum_id: { $in: userMuseums } };
        }
        const artworks = await Item.find(query).populate('museum_id', 'museum city').lean();
        res.json(artworks);
    } catch (error) {
        console.error('Errore nel recupero delle opere:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

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

const getArtworksByMuseum = async (req, res) => {
    try {
        const artworks = await Item.find({ museum_id: req.params.museumId }).lean();
        res.json(artworks);
    } catch (error) {
        console.error('Errore nel recupero delle opere del museo:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

const getDescriptionsByArtwork = async (req, res) => {
    try {
        const artworkId = req.params.id;
        const descriptions = await Language.find({ item_id: artworkId }).lean();

        if (!descriptions) return res.status(404).json({ error: 'Nessuna descrizione trovata' });

        res.json(descriptions);
    } catch (error) {
        console.error('Errore recupero descrizioni:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

const createArtwork = async (req, res) => {
    try {
       const { item, img_path, museum_id, author, license, sala, description, desc_type, desc_length } = req.body;

        if (!item || !img_path || !museum_id || !author || !license || !description) {
            return res.status(400).json({
                error: 'Campi obbligatori mancanti: item, img_path, museum_id, author, license'
            });
        }

        if (req.user && req.user.permissions !== 'admin') {
            const userMuseums = (req.user.museums || []).map(id => id.toString());
            if (!userMuseums.includes(museum_id ? museum_id.toString() : '')) {
                return res.status(403).json({ error: 'Non hai i permessi per aggiungere opere a questo museo' });
            }
        }

        const newArtwork = new Item({
            item,
            img_path,
            museum_id,
            author,
            license,
            sala
        });
        await newArtwork.save();

        const newLanguage = new Language({
            type: desc_type || 'medio',
            text: description,
            length: desc_length || '15s',
            item_id: newArtwork._id
        });
        await newLanguage.save();
        res.status(201).json({ message: 'Opera creata con successo', artwork: newArtwork });
    } catch (error) {
        console.error('Errore nella creazione dell\'opera:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Nome opera già esistente' });
        }
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

const updateArtwork = async (req, res) => {
    try {
        const existingItem = await Item.findById(req.params.id);
        if (!existingItem) return res.status(404).json({ error: 'Opera non trovata' });

        if (req.user && req.user.permissions !== 'admin') {
            const userMuseums = (req.user.museums || []).map(id => id.toString());
            if (!userMuseums.includes(existingItem.museum_id.toString())) {
                return res.status(403).json({ error: 'Non hai i permessi per modificare questa opera' });
            }
        }

        const { item, img_path, museum_id, author, license, sala, description, desc_type, desc_length } = req.body;

        const updated = await Item.findByIdAndUpdate(
            req.params.id,
            { $set: { item, img_path, museum_id, author, license, sala } },
            { returnDocument: 'after', runValidators: true }
        );

        // Aggiorna la descrizione specifica per combinazione (tipo, durata) o la crea se non esiste ancora
        await Language.findOneAndUpdate(
            { item_id: req.params.id, type: desc_type || 'medio', length: desc_length || '15s' },
            { $set: {
                text: description,
                length: desc_length || '15s',
                type: desc_type || 'medio'
            }},
            { upsert: true }
        );

        res.json({ message: 'Opera aggiornata', artwork: updated });
    } catch (error) {
        console.error('Errore nell\'aggiornamento dell\'opera:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Nome opera già esistente' });
        }
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

const deleteArtwork = async (req, res) => {
    try {
        const artworkId = req.params.id;
        const existingItem = await Item.findById(artworkId);
        if (!existingItem) return res.status(404).json({ error: 'Opera non trovata' });

        if (req.user && req.user.permissions !== 'admin') {
            const userMuseums = (req.user.museums || []).map(id => id.toString());
            if (!userMuseums.includes(existingItem.museum_id.toString())) {
                return res.status(403).json({ error: 'Non hai i permessi per eliminare questa opera' });
            }
        }

        deleteLocalFile(existingItem.img_path);
        await Language.deleteMany({ item_id: artworkId });
        await Visit.updateMany({}, { $pull: { items: artworkId } });
        await Item.findByIdAndDelete(artworkId);
        res.json({ message: 'Opera e file associati eliminati con successo' });
    } catch (error) {
        console.error('Errore nell\'eliminazione dell\'opera:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = {
    getAllArtworks,
    getArtworkById,
    getArtworksByMuseum,
    getDescriptionsByArtwork,
    createArtwork,
    updateArtwork,
    deleteArtwork
};
