// File: index.js
require('dotenv').config(); // qui ci abbiamo salvato tutte le variabili per il mongoDB
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Admin = require('./models/admin'); // modello admin
const api_login = "/api/login";
const app = express();

app.use(cors()); // Permette al frontend React (Vite) di comunicare col backend
app.use(express.json()); // Permette al server di leggere i dati JSON nel body

// Connessione a MongoDB tramite Mongoose
// Costruiamo l'URI di MongoDB unendo le variabili del .env
const dbUser = process.env.MONGO_USER;
const dbPwd = process.env.MONGO_PWD;
const dbHost = process.env.MONGO_HOST;
const dbName = process.env.MONGO_SITE;
const MONGODB_URI = `mongodb://${dbUser}:${dbPwd}@${dbHost}/${dbName}`;

// Connessione a MongoDB tramite Mongoose
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connesso a MongoDB!'))
  .catch((err) => console.error('❌ Errore di connessione a MongoDB:', err));

// in sostanza quando manderemo una richiesta ad /api/login eseguirà questo:
app.post(api_login, async (req, res) => {
  try {
    const { name, password } = req.body;

    // Cerca l'utente nel DB
    const adminUser = await Admin.findOne({ name });
    if (!adminUser) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Verifica la password criptata
    const isPasswordValid = await bcrypt.compare(password, adminUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Genera il Token JWT
    const token = jwt.sign(
      { id: adminUser._id, email: adminUser.name },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Rispondi al frontend col token
    res.json({ message: 'Login effettuato!', token });

  } catch (error) {
    console.error("Errore nel login:", error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Avvio del Server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}!`);
});
