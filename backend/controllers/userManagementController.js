const login = require('../models/admin'); // Il tuo modello ibrido
const path = require('path');

module.exports = {

    // Cerca utenti per nome o ID
    searchUsers: async (req, res) => {
        try {
            const q = (req.query.q || '').trim();

            // Se la query è vuota, restituisci tutti gli utenti (limitati a 50)
            if (!q) {
                const users = await login.find({})
                    .select('name permissions museums')
                    .sort({ name: 1 })
                    .limit(50);
                return res.json(users);
            }

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
            // Aggiorna anche i permessi a 'editor' se l'utente è 'visitatore'
            const user = await login.findById(id);

            if (!user) return res.status(404).json({ error: "Utente non trovato" });

            // Aggiorna permessi se è visitatore
            const updateData = { $addToSet: { museums: museumId } };
            if (user.permissions === 'visitatore') {
                updateData.$set = { permissions: 'editor' };
            }

            const updatedUser = await login.findByIdAndUpdate(
                id,
                updateData,
                { returnDocument: 'after' }
            ).populate('museums', 'museum region provence');

            res.json(updatedUser);
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
    },

    // delete user (solo se non è admin)
    deleteUser: async (req, res) => {
        try {
            const user = await login.findById(req.params.id);

            if (!user) return res.status(404).json({ error: "Utente non trovato" });

            // Non permettere di eliminare gli utenti admin
            if (user.permissions === 'admin') {
                return res.status(403).json({ error: "Non è possibile eliminare un utente admin" });
            }

            await login.findByIdAndDelete(req.params.id);
            res.json({ message: "Utente eliminato con successo" });
        } catch (error) {
            res.status(500).json({ error: "Errore eliminazione utente" });
        }
    }
};
