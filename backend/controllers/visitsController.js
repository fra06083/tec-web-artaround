const { visit: Visit, museum: Museum, quizQuestion: QuizQuestion } = require('../models/museums');

// GET /api/visite
// Ritorna le visite. Se l'utente loggato è un docente e manage=true, ritorna solo le sue.
// Se l'utente è un editor e manage=true, ritorna solo quelle dei musei assegnati.
const getAllVisits = async (req, res) => {
    try {
        let query = {};
        if (req.query.manage === 'true' && req.user) {
            if (req.user.permissions === 'docente') {
                query = { createdBy: req.user._id };
            } else if (req.user.permissions === 'editor') {
                const userMuseums = (req.user.museums || []).map(id => id.toString());
                query = { museum_id: { $in: userMuseums } };
            } else if (req.user.permissions === 'admin') {
                query = {};
            } else {
                query = { isPrivate: { $ne: true } };
            }
        } else {
            // Marketplace / Navigator pubblico: mostra SOLO visite non private
            query = { isPrivate: { $ne: true } };
        }

        if (req.query.museum_id) {
            query.museum_id = req.query.museum_id;
        }

        const visits = await Visit.find(query)
            .populate('museum_id', 'museum province image mappa description')
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
            .populate('museum_id', 'museum province image mappa')
            .populate('items')
            .lean();
        if (!visit) return res.status(404).json({ error: 'Visita non trovata' });

        // Controllo permessi editor
        if (req.user && req.user.permissions === 'editor') {
            const userMuseums = (req.user.museums || []).map(id => id.toString());
            const visitMuseumId = visit.museum_id ? (visit.museum_id._id ? visit.museum_id._id.toString() : visit.museum_id.toString()) : '';
            if (!userMuseums.includes(visitMuseumId)) {
                return res.status(403).json({ error: 'Non disponi dei permessi per accedere alla visita di questo museo' });
            }
        }

        // Se la visita è privata, vieta la fruizione individuale diretta senza PIN o permessi
        if (visit.isPrivate && !req.query.pin && (!req.user || req.user.permissions === 'studente')) {
            return res.status(403).json({ error: 'Questa visita è privata. Puoi accedervi solo tramite il codice PIN fornito dal docente.' });
        }

        res.json(visit);
    } catch (error) {
        console.error('Errore nel recupero della visita:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};


// POST /api/visite
const createVisit = async (req, res) => {
    try {
        const { name, description, museum_id, logistic_info, items, createdBy, tags, mnemonicCode, isPrivate, image } = req.body;

        if (!name || !museum_id) {
            return res.status(400).json({ error: 'Nome e museo sono obbligatori' });
        }

        // Controllo permessi editor
        if (req.user && req.user.permissions === 'editor') {
            const userMuseums = (req.user.museums || []).map(id => id.toString());
            if (!userMuseums.includes(museum_id ? museum_id.toString() : '')) {
                return res.status(403).json({ error: 'Non disponi dei permessi per creare visite per questo museo' });
            }
        }

        const codeToSave = mnemonicCode ? String(mnemonicCode).trim().slice(0, 6) : '';
        const newVisit = new Visit({
            name,
            description,
            image,
            museum_id,
            logistic_info: logistic_info || [],
            items: items || [],
            tags: tags || [],
            mnemonicCode: codeToSave,
            isPrivate: isPrivate || false,
            createdBy: req.user ? req.user._id : (createdBy || null)
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
        const visitToUpdate = await Visit.findById(req.params.id);
        if (!visitToUpdate) return res.status(404).json({ error: 'Visita non trovata' });

        // Controllo permessi docente
        if (req.user && req.user.permissions === 'docente') {
            if (!visitToUpdate.createdBy || visitToUpdate.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Non sei autorizzato a modificare questa visita' });
            }
        }

        // Controllo permessi editor
        if (req.user && req.user.permissions === 'editor') {
            const userMuseums = (req.user.museums || []).map(id => id.toString());
            const visitMuseumId = visitToUpdate.museum_id ? visitToUpdate.museum_id.toString() : '';
            if (!userMuseums.includes(visitMuseumId)) {
                return res.status(403).json({ error: 'Non sei autorizzato a modificare la visita di questo museo' });
            }
            if (req.body.museum_id && !userMuseums.includes(req.body.museum_id.toString())) {
                return res.status(403).json({ error: 'Non puoi spostare la visita in un museo a cui non hai accesso' });
            }
        }

        const updateData = { ...req.body };
        if (updateData.mnemonicCode !== undefined) {
            updateData.mnemonicCode = String(updateData.mnemonicCode).trim().slice(0, 6);
        }

        const updated = await Visit.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { returnDocument: 'after', runValidators: true }
        );
        res.json({ message: 'Visita aggiornata', visit: updated });
    } catch (error) {
        console.error('Errore nell\'aggiornamento della visita:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// DELETE /api/visite/:id
const deleteVisit = async (req, res) => {
    try {
        const visitToDelete = await Visit.findById(req.params.id);
        if (!visitToDelete) return res.status(404).json({ error: 'Visita non trovata' });

        // Controllo permessi docente
        if (req.user && req.user.permissions === 'docente') {
            if (!visitToDelete.createdBy || visitToDelete.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Non sei autorizzato a eliminare questa visita' });
            }
        }

        // Controllo permessi editor
        if (req.user && req.user.permissions === 'editor') {
            const userMuseums = (req.user.museums || []).map(id => id.toString());
            const visitMuseumId = visitToDelete.museum_id ? visitToDelete.museum_id.toString() : '';
            if (!userMuseums.includes(visitMuseumId)) {
                return res.status(403).json({ error: 'Non sei autorizzato a eliminare la visita di questo museo' });
            }
        }

        await Visit.findByIdAndDelete(req.params.id);
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

        if (req.user && req.user.permissions === 'editor') {
            const userMuseums = (req.user.museums || []).map(id => id.toString());
            const visitMuseumId = visit.museum_id ? visit.museum_id.toString() : '';
            if (!userMuseums.includes(visitMuseumId)) {
                return res.status(403).json({ error: 'Non sei autorizzato a modificare la visita di questo museo' });
            }
        }

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

        if (req.user && req.user.permissions === 'editor') {
            const userMuseums = (req.user.museums || []).map(id => id.toString());
            const visitMuseumId = visit.museum_id ? visit.museum_id.toString() : '';
            if (!userMuseums.includes(visitMuseumId)) {
                return res.status(403).json({ error: 'Non sei autorizzato a modificare la visita di questo museo' });
            }
        }

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

// GET /api/visite/:id/quiz
const getQuizByVisit = async (req, res) => {
    try {
        const questions = await QuizQuestion.find({ visit_id: req.params.id })
            .sort({ order: 1 })
            .lean();
        res.json(questions);
    } catch (error) {
        console.error('Errore nel recupero del quiz:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/visite/:id/quiz
const addQuizQuestion = async (req, res) => {
    try {
        const { question, options, correctIndex, order } = req.body;

        if (!question || !Array.isArray(options) || options.length < 2 || correctIndex === undefined) {
            return res.status(400).json({ error: 'question, options (min 2) e correctIndex sono obbligatori' });
        }
        if (correctIndex < 0 || correctIndex >= options.length) {
            return res.status(400).json({ error: 'correctIndex non valido' });
        }

        const visit = await Visit.findById(req.params.id);
        if (!visit) return res.status(404).json({ error: 'Visita non trovata' });

        // Controllo permessi docente (stesso pattern di updateVisit)
        if (req.user && req.user.permissions === 'docente') {
            if (!visit.createdBy || visit.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Non sei autorizzato a modificare questa visita' });
            }
        }

        if (req.user && req.user.permissions === 'editor') {
            const userMuseums = (req.user.museums || []).map(id => id.toString());
            const visitMuseumId = visit.museum_id ? visit.museum_id.toString() : '';
            if (!userMuseums.includes(visitMuseumId)) {
                return res.status(403).json({ error: 'Non sei autorizzato a modificare la visita di questo museo' });
            }
        }

        const newQuestion = new QuizQuestion({
            visit_id: req.params.id,
            question,
            options,
            correctIndex,
            order: order || 0
        });
        await newQuestion.save();

        res.status(201).json({ message: 'Domanda aggiunta', question: newQuestion });
    } catch (error) {
        console.error('Errore nell\'aggiunta della domanda:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PUT /api/visite/:id/quiz/:questionId
const updateQuizQuestion = async (req, res) => {
    try {
        const { question, options, correctIndex, order } = req.body;

        const existing = await QuizQuestion.findById(req.params.questionId);
        if (!existing) return res.status(404).json({ error: 'Domanda non trovata' });

        const visit = await Visit.findById(req.params.id);
        if (!visit) return res.status(404).json({ error: 'Visita non trovata' });

        if (req.user && req.user.permissions === 'docente') {
            if (!visit.createdBy || visit.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Non sei autorizzato a modificare questa visita' });
            }
        }

        if (req.user && req.user.permissions === 'editor') {
            const userMuseums = (req.user.museums || []).map(id => id.toString());
            const visitMuseumId = visit.museum_id ? visit.museum_id.toString() : '';
            if (!userMuseums.includes(visitMuseumId)) {
                return res.status(403).json({ error: 'Non sei autorizzato a modificare la visita di questo museo' });
            }
        }

        const updated = await QuizQuestion.findByIdAndUpdate(
            req.params.questionId,
            { $set: { question, options, correctIndex, order } },
            { returnDocument: 'after', runValidators: true }
        );

        res.json({ message: 'Domanda aggiornata', question: updated });
    } catch (error) {
        console.error('Errore nell\'aggiornamento della domanda:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// DELETE /api/visite/:id/quiz/:questionId
const removeQuizQuestion = async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id);
        if (!visit) return res.status(404).json({ error: 'Visita non trovata' });

        if (req.user && req.user.permissions === 'docente') {
            if (!visit.createdBy || visit.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Non sei autorizzato a modificare questa visita' });
            }
        }

        if (req.user && req.user.permissions === 'editor') {
            const userMuseums = (req.user.museums || []).map(id => id.toString());
            const visitMuseumId = visit.museum_id ? visit.museum_id.toString() : '';
            if (!userMuseums.includes(visitMuseumId)) {
                return res.status(403).json({ error: 'Non sei autorizzato a modificare la visita di questo museo' });
            }
        }

        const deleted = await QuizQuestion.findByIdAndDelete(req.params.questionId);
        if (!deleted) return res.status(404).json({ error: 'Domanda non trovata' });

        res.json({ message: 'Domanda rimossa' });
    } catch (error) {
        console.error('Errore nella rimozione della domanda:', error);
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
    removeItemFromVisit,
    getQuizByVisit,
    addQuizQuestion,
    updateQuizQuestion,
    removeQuizQuestion
};
