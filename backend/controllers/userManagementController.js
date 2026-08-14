const User = require('../models/user'); // Il tuo modello ibrido
const path = require('path');
const bcrypt = require('bcrypt');

module.exports = {

    // Cerca utenti per nome, ruolo (permissions) o ID
    searchUsers: async (req, res) => {
        try {
            const q = (req.query.q || '').trim();
            const mongoose = require('mongoose');

            let query = {};
            if (q) {
                const isId = mongoose.Types.ObjectId.isValid(q);
                const searchRegex = new RegExp(q, 'i');
                const lowerQ = q.toLowerCase();

                // Mappatura flessibile italiano/inglese per i ruoli
                const roleMatches = [];
                if (/^(editor|autore|autori|scrittore|creatore)/i.test(lowerQ)) {
                    roleMatches.push('editor');
                }
                if (/^(docente|docenti|prof|professore|professoressa|insegnante)/i.test(lowerQ)) {
                    roleMatches.push('docente');
                }
                if (/^(admin|amministratore|amministratori)/i.test(lowerQ)) {
                    roleMatches.push('admin');
                }
                if (/^(visitatore|visitatori|utente|utenti|guest)/i.test(lowerQ)) {
                    roleMatches.push('visitatore');
                }

                const orConditions = [
                    { name: searchRegex },
                    { permissions: searchRegex }
                ];

                if (roleMatches.length > 0) {
                    orConditions.push({ permissions: { $in: roleMatches } });
                }

                if (isId) {
                    orConditions.push({ _id: q });
                }

                query = { $or: orConditions };
            }

            const users = await User.find(query)
                .select('name permissions museums propic')
                .sort({ name: 1 })
                .limit(50);

            res.json(users);
        } catch (error) {
            console.error("Errore nella ricerca utenti:", error);
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

            // 2. Solo il master "admin" può eliminare altri admin
            if (user.permissions === 'admin' && req.user.permissions !== 'admin') {
                return res.status(403).json({ error: "Solo l'admin può eliminare altri amministratori" });
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

            const updatedUser = await User.findByIdAndUpdate(
                id,
                { $set: { permissions: permissions } },
                { returnDocument: 'after', runValidators: true }
            ).populate('museums', 'museum region provence');

            res.json(updatedUser);
        } catch (error) {
            res.status(500).json({ error: "Errore aggiornamento ruolo utente" });
        }
    },

    // update user name
    updateUserName: async (req, res) => {
        try {
            const { id } = req.params;
            const { name } = req.body;
            
            if (!name || name.trim() === '') {
                return res.status(400).json({ error: "Il nome non può essere vuoto" });
            }

            const user = await User.findById(id);
            if (!user) return res.status(404).json({ error: "Utente non trovato" });

            // Controlla se il nome esiste già (siccome il model richiede che 'name' sia unique)
            const escapedName = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const existing = await User.findOne({ name: { $regex: new RegExp(`^${escapedName}$`, 'i') } });
            if (existing && existing._id.toString() !== id) {
                return res.status(400).json({ error: "Questo username è già in uso da un altro utente" });
            }

            const updatedUser = await User.findByIdAndUpdate(
                id,
                { $set: { name: name.trim() } },
                { returnDocument: 'after', runValidators: true }
            ).populate('museums', 'museum region provence');

            res.json(updatedUser);
        } catch (error) {
            if (error.code === 11000) return res.status(400).json({ error: "Questo username è già in uso" });
            res.status(500).json({ error: "Errore aggiornamento nome utente" });
        }
    },

    // update user password (forzata da parte dell'admin)
    updateUserPassword: async (req, res) => {
        try {
            const { id } = req.params;
            const { newPassword } = req.body;

            if (!newPassword || newPassword.trim().length < 4) {
                return res.status(400).json({ error: "La nuova password deve contenere almeno 4 caratteri" });
            }

            const user = await User.findById(id);
            if (!user) return res.status(404).json({ error: "Utente non trovato" });

            // Solo admin master o admin può cambiare la password ad un altro utente
            if (user.permissions === 'admin' && req.user._id.toString() !== user._id.toString() && req.user.permissions !== 'admin') {
                return res.status(403).json({ error: "Permessi insufficienti per modificare questo utente" });
            }

            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(newPassword.trim(), saltRounds);

            user.password = hashedPassword;
            await user.save();

            res.json({ message: `Password dell'utente "${user.name}" aggiornata con successo.` });
        } catch (error) {
            console.error("Errore modifica password utente:", error);
            res.status(500).json({ error: "Errore durante l'aggiornamento della password" });
        }
    }
};
