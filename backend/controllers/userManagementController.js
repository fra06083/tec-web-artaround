const User = require('../models/user'); // Il tuo modello ibrido
const path = require('path');

module.exports = {

    // Cerca utenti per nome o ID
    searchUsers: async (req, res) => {
        try {
            const q = (req.query.q || '').trim();

            // Se la query è vuota, restituisci tutti gli utenti (limitati a 50)
            if (!q) {
                const users = await User.find({})
                    .select('name permissions museums')
                    .sort({ name: 1 })
                    .limit(50);
                return res.json(users);
            }

            // Cerca nel campo 'name'
            const users = await User.find({
                name: { $regex: q, $options: 'i' }
            }).select('name permissions museums').limit(10);

            res.json(users);
        } catch (error) {
            res.status(500).json({ error: "Errore nella ricerca" });
        }
    },

    getUserById: async (req, res) => {
        try {
            const user = await User.findById(req.params.id)
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
            const user = await User.findById(id);

            if (!user) return res.status(404).json({ error: "Utente non trovato" });

            // Aggiungi solo il museo
            const updateData = { $addToSet: { museums: museumId } };

            const updatedUser = await User.findByIdAndUpdate(
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
            const user = await User.findByIdAndUpdate(
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
            const user = await User.findById(req.params.id);

            if (!user) return res.status(404).json({ error: "Utente non trovato" });

            // 1. Non permettere di eliminare sé stessi
            if (user._id.toString() === req.user._id.toString()) {
                return res.status(403).json({ error: "Non puoi eliminare il tuo stesso account" });
            }

            // 2. L'utente "admin" è il master e non può mai essere eliminato da nessuno
            if (user.name === 'admin') {
                return res.status(403).json({ error: "L'utente master 'admin' non può essere eliminato" });
            }

            // 3. Solo il master "admin" può eliminare altri admin
            if (user.permissions === 'admin' && req.user.name !== 'admin') {
                return res.status(403).json({ error: "Solo l'admin master può eliminare altri amministratori" });
            }

            await User.findByIdAndDelete(req.params.id);
            res.json({ message: "Utente eliminato con successo" });
        } catch (error) {
            res.status(500).json({ error: "Errore eliminazione utente" });
        }
    },

    // update user role
    updateUserRole: async (req, res) => {
        try {
            const { id } = req.params;
            const { permissions } = req.body;
            
            // Check if valid role
            const validRoles = ["visitatore", "editor", "docente", "admin"];
            if (!validRoles.includes(permissions)) {
                return res.status(400).json({ error: "Ruolo non valido" });
            }

            const user = await User.findById(id);
            if (!user) return res.status(404).json({ error: "Utente non trovato" });

            // Impedisci di cambiare il ruolo dell'admin master
            if (user.name === 'admin' && permissions !== 'admin') {
                return res.status(403).json({ error: "Non puoi modificare il ruolo dell'amministratore master" });
            }

            const updatedUser = await User.findByIdAndUpdate(
                id,
                { $set: { permissions: permissions } },
                { returnDocument: 'after', runValidators: true }
            ).populate('museums', 'museum region provence');

            res.json(updatedUser);
        } catch (error) {
            res.status(500).json({ error: "Errore aggiornamento ruolo utente" });
        }
    }
};
