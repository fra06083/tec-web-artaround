// File: index.js
global.rootDir = __dirname;
global.startDate = null; // Aggiunto come nel file del prof

/* ========= importing modules ========= */
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const login = require('./models/admin');

const app = express();

app.enable('trust proxy');

// 2. MIDDLEWARE BASE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Dal file del prof, utile per leggere i body delle richieste

// 3. FILE STATICI, dato che il percorso non cambia mai
app.use(express.static(path.join(__dirname, '../')));
app.use('/marketplace', express.static(path.join(__dirname, '../editor-marketplace')));
app.use('/navigator', express.static(path.join(__dirname, '../navigator/dist')));

// 4. CONNESSIONE MONGODB
const dbUser = process.env.MONGO_USER;
const dbPwd = process.env.MONGO_PWD;
const dbHost = process.env.MONGO_HOST;
const PORT = process.env.PORT || 27017;
const dbName = "musei";

if (dbUser && dbPwd && dbHost) {
    const MONGODB_URI = `mongodb://${dbUser}:${dbPwd}@${dbHost}:${PORT}/${dbName}?authSource=admin&writeConcern=majority`;
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('Connesso a MongoDB!!'))
        .catch((err) => console.error('<!>> Errore di connessione a MongoDB:', err));
} else {
    console.error('ATTENZIONE: Variabili di ambiente MongoDB mancanti. Il file .env è su Gocker?');
}

// --- REGISTRAZIONE ---
app.post('/api/register', async (req, res) => {
    try {
        console.log("PRESA IN GESTIONE RICHIESTA REGISTRAZIONE");

        // FORM DATAS
        const { name, password } = req.body;

        // CHECK IF NULL
        if (!name || !password) {
            return res.status(400).json({ error: 'Nome e password sono obbligatori' });
        }

        // CHECK EXISTING USER (NOT OVERWRITE)
        const existingUser = await login.findOne({ name });
        if (existingUser) {
            return res.status(400).json({ error: 'Nome utente già in uso' });
        }

        // HASHING
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new login({
            name: name,
            password: hashedPassword,
            permissions: 'visitatore' // always check visitatore, if we let choose the role we might have security problems!
        });

        await newUser.save();
        res.status(201).json({ message: 'Registrazione completata!' });

    } catch (error) {
        console.error("Errore nella registrazione:", error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});


// --- LOGIN ---
app.post('/api/login', async (req, res) => {
    try {
        console.log("PRESA IN GESTIONE RICHIESTA LOGIN");
        const { name, password } = req.body;

        if (!name || !password) {
            return res.status(400).json({ error: 'Nome e password sono obbligatori' });
        }

        const adminUser = await login.findOne({ name });
        if (!adminUser) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        const isPasswordValid = await bcrypt.compare(password, adminUser.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        // 3. Generazione del Token JWT
        // Includiamo l'ID, il nome e le PERMISSIONS (corretto da 'role')
        const token = jwt.sign(
            {
                id: adminUser._id,
                name: adminUser.name,
                permissions: adminUser.permissions
            },
            // AGGIUNTO FALLBACK: Previene crash fatali se manca JWT_SECRET nel file .env
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );

        res.json({ message: 'Login effettuato!', token });

    } catch (error) {
        console.error("Errore nel login: ", error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});
// --- VERIFICA TOKEN (Middleware, used to check if the saved token is expired or changed manually!) ---
app.get('/api/check', (req, res) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ error: 'Nessun token fornito' });
    }

    try {
        // Decodifichiamo direttamente la stringa passata
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
        res.json({ valid: true, user: decoded });
    } catch (error) {
        res.status(401).json({ error: 'Token non valido o scaduto' });
    }
});
// 6. AVVIO DEL SERVER (Correzione cruciale per il 502)
app.listen(8000, () => {
    global.startDate = new Date();
    console.log(`Server in ascolto sulla porta 8000 started ${global.startDate.toLocaleString()}`);
});
