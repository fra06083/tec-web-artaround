// File: index.js
global.rootDir = __dirname;
global.startDate = null; // Aggiunto come nel file del prof

// Assicurati che il file .env sia fisicamente presente su Gocker!
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
// Assicurati che questo percorso sia corretto rispetto a index.js
const Admin = require('./models/admin'); 

const app = express();

// 1. IMPOSTAZIONI PROXY (Dal file del prof - Fondamentale su Gocker)
app.enable('trust proxy');

// 2. MIDDLEWARE BASE
app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); // Dal file del prof, utile per leggere i body delle richieste

// 3. FILE STATICI
// NOTA: Assicurati che usare '../' sia corretto. Se avvii da 'backend/index.js', ../ va nella root.
app.use(express.static(path.join(__dirname, '../')));
app.use('/marketplace', express.static(path.join(__dirname, '../marketplace')));
app.use('/navigator', express.static(path.join(__dirname, '../navigator/dist')));

// 4. CONNESSIONE MONGODB
const dbUser = process.env.MONGO_USER.trim();
const dbPwd = process.env.MONGO_PWD.trim();
const dbHost = process.env.MONGO_HOST.trim(); 
const PORT = process.env.PORT.trim() || 27017;
const dbName = "musei";
// Controllo di sicurezza: se manca il .env, non facciamo crashare l'app in modo silenzioso
if (dbUser && dbPwd && dbHost) {
    const MONGODB_URI = `mongodb://${dbUser}:${dbPwd}@${dbHost}:${PORT}/${dbName}?authSource=admin&writeConcern=majority`;
    mongoose.connect(MONGODB_URI)
     .then(() => console.log('Connesso a MongoDB!!'))
     .catch((err) => console.error('<!>> Errore di connessione a MongoDB:', err));
} else {
    console.error('ATTENZIONE: Variabili di ambiente MongoDB mancanti. Il file .env è su Gocker?');
}

// 5. ROTTE dopo vediamo come gestirle meglio
const api_login = "/api/login";
app.post(api_login, async (req, res) => {
  try {
    const { name, password } = req.body;

    const adminUser = await Admin.findOne({ name });
    if (!adminUser) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const isPasswordValid = await bcrypt.compare(password, adminUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const token = jwt.sign(
      { id: adminUser._id, email: adminUser.name },
      process.env.JWT_SECRET || 'secret_di_riserva', // Evita crash se manca il secret
      { expiresIn: '2h' }
    );

    res.json({ message: 'Login effettuato!', token });

  } catch (error) {
    console.error("Errore nel login:", error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// 6. AVVIO DEL SERVER (Correzione cruciale per il 502)
// Se process.env.PORT non esiste, FORZIAMO la porta 8000 come fa il professore.
app.listen(8000, () => {
    global.startDate = new Date();
    console.log(`✅ Server in ascolto sulla porta 8000 started ${global.startDate.toLocaleString()}`);
});
