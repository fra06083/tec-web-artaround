
global.rootDir = __dirname;
global.startDate = null;

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

// abilita il proxy per l'ambiente docker/nginx
app.enable('trust proxy');

app.use(cookieParser());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/marketplace', express.static(path.join(__dirname, '../editor-marketplace')));
app.use('/navigator', express.static(path.join(__dirname, '../public/navigator/dist')));
app.use(express.static(path.join(__dirname, '../public')));

const dbUser = process.env.MONGO_USER;
const dbPwd = process.env.MONGO_PWD;
const dbHost = process.env.MONGO_HOST;
const PORT = process.env.PORT || 27017;
const dbName = "musei";

// connessione mongodb con credenziali admin
if (dbUser && dbPwd && dbHost) {
    const MONGODB_URI = `mongodb://${dbUser}:${dbPwd}@${dbHost}:${PORT}/${dbName}?authSource=admin&writeConcern=majority`;
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('Connesso a MongoDB!!'))
        .catch((err) => console.error('<!>> Errore di connessione a MongoDB:', err));
} else {
    console.error('ATTENZIONE: Variabili di ambiente MongoDB mancanti. Il file .env è su Gocker?');
}

const authRoutes = require("./routes/auth.js");
const visitRoutes = require("./routes/visits.js");
const museumRoutes = require("./routes/museums.js");
const adminRoutes = require("./routes/admin.js");
const userManagementRoutes = require("./routes/userManagement.js");
const artworkRoutes = require("./routes/artworks.js");
const roomRoutes = require("./routes/rooms.js");
const uploadRoutes = require("./routes/upload.js");

app.use("/api", authRoutes);
app.use("/editor", adminRoutes);
app.use("/api/visite", visitRoutes);
app.use("/api/museums", museumRoutes);
app.use("/api/artworks", artworkRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/editor/user-management", userManagementRoutes);
app.use("/api/upload", uploadRoutes);

// fallback per le rotte client-side del navigator (SPA)
app.get('/navigator/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/navigator/dist/index.html'));
});

app.listen(8000, () => {
    global.startDate = new Date();
    console.log(`Server in ascolto sulla porta 8000 started ${global.startDate.toLocaleString()}`);
});
