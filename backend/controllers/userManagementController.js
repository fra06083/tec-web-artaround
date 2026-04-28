const login = require('../models/admin'); // Il tuo modello ibrido
const path = require('path');

module.exports = {

    // Cerca utenti per nome o ID
    searchUsers: async (req, res) => {
        try {
            const q = (req.query.q || '').trim();
            if (!q) return res.json([]);

            // Cerca nel campo 'name'
            const users = await login.find({
                name: { $regex: q, $options: 'i' }
            }).select('name permissions museums').limit(10);

            res.json(users);
        } catch (error) {
            res.status(500).json({ error: "Errore nella ricerca" });
        }
    },

    getUserById: async (req, res) => {
        try {
            const user = await login.findById(req.params.id)
                .populate('museums', 'museum region provence'); // Popola i dettagli dei musei

            if (!user) return res.status(404).json({ error: "Utente non trovato" });
            res.json(user);
        } catch (error) {
            res.status(500).json({ error: "Errore recupero utente" });
        }
    },

    // grant permission
    grantMuseumPermission: async (req, res) => {
        try {
            const { id, museumId } = req.params;
            // $addToSet evita di aggiungere due volte lo stesso museo
            const user = await login.findByIdAndUpdate(
                id,
                { $addToSet: { museums: museumId } },
                { returnDocument: 'after' }
            ).populate('museums', 'museum region provence');

            res.json(user);
        } catch (error) {
            res.status(500).json({ error: "Errore assegnazione permesso" });
        }
    },

    // revoke permission
    revokeMuseumPermission: async (req, res) => {
        try {
            const { id, museumId } = req.params;
            const user = await login.findByIdAndUpdate(
                id,
                { $pull: { museums: museumId } },
                { returnDocument: 'after' }
            ).populate('museums', 'museum region provence');

            res.json(user);
        } catch (error) {
            res.status(500).json({ error: "Errore rimozione permesso" });
        }
    }
};
