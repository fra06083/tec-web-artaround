
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

// ROUTES 
const authRoutes = require("./routes/auth.js");
const visitRoutes = require("./routes/visits.js"); // used in the future!!!!!!!!!
app.use("/api", authRoutes);


// 6. AVVIO DEL SERVER (Correzione cruciale per il 502)
app.listen(8000, () => {
    global.startDate = new Date();
    console.log(`Server in ascolto sulla porta 8000 started ${global.startDate.toLocaleString()}`);
});
