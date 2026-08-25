const { museum: Museum, item: Item, visit: Visit, language: Language, quizQuestion: QuizQuestion, quizResult: QuizResult } = require('../models/museums');
const User = require('../models/user');
const path = require('path');
const fs = require('fs');

const deleteLocalFile = (imgPath) => {
    if (!imgPath || typeof imgPath !== 'string') return;
    const filePath = (path.isAbsolute(imgPath) && fs.existsSync(imgPath))
        ? imgPath
        : path.join(__dirname, '../../public', imgPath.replace(/^\//, ''));
    try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.error("Errore durante l'eliminazione del file:", err);
    }
};

const getAllMuseums = async (req, res) => {
    try {
        let museums;
        // I docenti e gli editor vedono solo i musei assegnati al proprio profilo, gli admin tutti
        if (req.user.permissions === 'docente' || req.user.permissions === 'editor') {
            const userWithMuseums = await require('../models/user.js').findById(req.user._id).populate('museums').lean();
            museums = userWithMuseums ? (userWithMuseums.museums || []) : [];
        } else {
            museums = await Museum.find().lean();
        }
        res.json(museums);
    } catch (error) {
        console.error('Errore nel recupero dei musei:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

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

const createMuseum = async (req, res) => {
    try {
        const { museum, city, province, region, address, description, image,mappa } = req.body;

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
            image,
            mappa
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

const updateMuseum = async (req, res) => {
    try {
        if (req.user.permissions !== 'admin') {
            const userMuseums = (req.user.museums || []).map(id => id.toString());
            if (!userMuseums.includes(req.params.id.toString())) {
                return res.status(403).json({ error: 'Non hai i permessi per modificare questo museo' });
            }
        }

        const { museum, city, province, region, address, description, image, mappa } = req.body;

        if (museum) {
            const existingMuseum = await Museum.findOne({ museum, _id: { $ne: req.params.id } });
            if (existingMuseum) {
                return res.status(409).json({ error: 'Un museo con questo nome è già presente' });
            }
        }

        const updated = await Museum.findByIdAndUpdate(
            req.params.id,
            { $set: { museum, city, province, region, address, description, image, mappa } },
            { returnDocument: 'after', runValidators: true }
        );
        if (!updated) return res.status(404).json({ error: 'Museo non trovato' });
        res.json({ message: 'Museo aggiornato', museum: updated });
    } catch (error) {
        console.error('Errore nell\'aggiornamento del museo:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

const deleteMuseum = async (req, res) => {
    try {
        const museumId = req.params.id;
        const museumToDelete = await Museum.findById(museumId);
        if (!museumToDelete) return res.status(404).json({ error: 'Museo non trovato' });

        // 1. Trova opere e visite per la pulizia a cascata
        const items = await Item.find({ museum_id: museumId });
        const itemIds = items.map(i => i._id);

        const visits = await Visit.find({ museum_id: museumId });
        const visitIds = visits.map(v => v._id);

        // 2. Cancella da disco tutte le immagini associate (copertina museo, piante dei piani, opere, visite)
        deleteLocalFile(museumToDelete.image);
        if (museumToDelete.mappa && Array.isArray(museumToDelete.mappa.piante)) {
            museumToDelete.mappa.piante.forEach(p => deleteLocalFile(p.immagine));
        }
        items.forEach(i => deleteLocalFile(i.img_path));
        visits.forEach(v => deleteLocalFile(v.image));

        // 3. Cancella in cascata descrizioni (language), domande quiz, risultati quiz e riferimenti ad opere nelle visite
        if (itemIds.length > 0) {
            await Language.deleteMany({ item_id: { $in: itemIds } });
            await Visit.updateMany({}, { $pull: { items: { $in: itemIds } } });
        }
        if (visitIds.length > 0) {
            await QuizQuestion.deleteMany({ visit_id: { $in: visitIds } });
            await QuizResult.deleteMany({ visit_id: { $in: visitIds } });
        }

        // 4. Rimuovi i riferimenti al museo e alle visite eliminate dagli utenti
        await User.updateMany(
            {},
            {
                $pull: {
                    museums: museumId,
                    purchased_visits: { $in: visitIds }
                }
            }
        );

        // 5. Elimina dal DB le visite, le opere e il museo stesso
        await Visit.deleteMany({ museum_id: museumId });
        await Item.deleteMany({ museum_id: museumId });
        await Museum.findByIdAndDelete(museumId);

        res.json({ message: 'Museo, visite, opere e file associati eliminati con successo' });
    } catch (error) {
        console.error('Errore nell\'eliminazione del museo:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

const getArtworksByMuseum = async (req, res) => {
    try {
        const artworks = await Item.find({ museum_id: req.params.id }).lean();
        res.json(artworks);
    } catch (error) {
        console.error('Errore nel recupero delle opere:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

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
