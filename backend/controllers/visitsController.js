const { visit: Visit, museum: Museum } = require('../models/museums');

// GET /api/visite
// Ritorna tutte le visite, con museo popolato
const getAllVisits = async (req, res) => {
    try {
        const visits = await Visit.find()
            .populate('museum_id', 'museum province')
            .lean();
        res.json(visits);
    } catch (error) {
        console.error('Errore nel recupero delle visite:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/visite/:id
const getVisitById = async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id)
            .populate('museum_id', 'museum province')
            .populate('items')
            .lean();
        if (!visit) return res.status(404).json({ error: 'Visita non trovata' });
        res.json(visit);
    } catch (error) {
        console.error('Errore nel recupero della visita:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/visite
const createVisit = async (req, res) => {
    try {
        const { name, description, museum_id, logistic_info, items } = req.body;

        if (!name || !museum_id) {
            return res.status(400).json({ error: 'Nome e museo sono obbligatori' });
        }

        const newVisit = new Visit({
            name,
            description,
            museum_id,
            logistic_info: logistic_info || [],
            items: items || []
        });

        await newVisit.save();
        res.status(201).json({ message: 'Visita creata con successo', visit: newVisit });
    } catch (error) {
        console.error('Errore nella creazione della visita:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PUT /api/visite/:id
const updateVisit = async (req, res) => {
    try {
        const updated = await Visit.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ error: 'Visita non trovata' });
        res.json({ message: 'Visita aggiornata', visit: updated });
    } catch (error) {
        console.error('Errore nell\'aggiornamento della visita:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// DELETE /api/visite/:id
const deleteVisit = async (req, res) => {
    try {
        const deleted = await Visit.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Visita non trovata' });
        res.json({ message: 'Visita eliminata con successo' });
    } catch (error) {
        console.error('Errore nell\'eliminazione della visita:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/visite/:id/items
const getItemsByVisit = async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id)
            .populate('items')
            .lean();
        if (!visit) return res.status(404).json({ error: 'Visita non trovata' });
        res.json(visit.items || []);
    } catch (error) {
        console.error('Errore nel recupero degli item:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/visite/:id/items -> aggiunge un item (ObjectId) alla visita
const addItemToVisit = async (req, res) => {
    try {
        const { item_id } = req.body;
        if (!item_id) return res.status(400).json({ error: 'item_id è obbligatorio' });

        const visit = await Visit.findById(req.params.id);
        if (!visit) return res.status(404).json({ error: 'Visita non trovata' });

        // Evita duplicati
        if (visit.items.map(id => id.toString()).includes(item_id)) {
            return res.status(400).json({ error: 'Item già presente nella visita' });
        }

        visit.items.push(item_id);
        await visit.save();
        res.status(201).json({ message: 'Item aggiunto', items: visit.items });
    } catch (error) {
        console.error('Errore nell\'aggiunta dell\'item:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// DELETE /api/visite/:id/items/:itemId
const removeItemFromVisit = async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id);
        if (!visit) return res.status(404).json({ error: 'Visita non trovata' });

        visit.items = visit.items.filter(
            id => id.toString() !== req.params.itemId
        );
        await visit.save();
        res.json({ message: 'Item rimosso', items: visit.items });
    } catch (error) {
        console.error('Errore nella rimozione dell\'item:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = {
    getAllVisits,
    getVisitById,
    createVisit,
    updateVisit,
    deleteVisit,
    getItemsByVisit,
    addItemToVisit,
    removeItemFromVisit
};
