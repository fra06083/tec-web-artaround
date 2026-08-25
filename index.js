const path = require('path');
const fs = require('fs');

global.rootDir = path.join(__dirname, 'src/backend');
global.startDate = null;

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const envPath = fs.existsSync(path.join(__dirname, 'src/backend/.env'))
    ? path.join(__dirname, 'src/backend/.env')
    : path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });

const app = express();

// abilita il proxy per l'ambiente docker/nginx
app.enable('trust proxy');

app.use(cookieParser());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Risoluzione della cartella public
const getPublicDir = () => {
    const candidates = [
        path.join(__dirname, 'src/public'),
        path.join(__dirname, 'public')
    ];
    for (const dir of candidates) {
        if (fs.existsSync(dir)) {
            return dir;
        }
    }
    return path.join(__dirname, 'src/public');
};

const publicDir = getPublicDir();

app.use('/marketplace', express.static(path.join(publicDir, 'editor-marketplace')));
app.use('/navigator', express.static(path.join(publicDir, 'navigator/dist')));
app.use(express.static(publicDir));

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

const authRoutes = require("./src/backend/routes/auth.js");
const visitRoutes = require("./src/backend/routes/visits.js");
const museumRoutes = require("./src/backend/routes/museums.js");
const adminRoutes = require("./src/backend/routes/admin.js");
const userManagementRoutes = require("./src/backend/routes/userManagement.js");
const artworkRoutes = require("./src/backend/routes/artworks.js");
const roomRoutes = require("./src/backend/routes/rooms.js");
const uploadRoutes = require("./src/backend/routes/upload.js");

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
    res.sendFile(path.join(publicDir, 'navigator/dist/index.html'));
});

app.listen(8000, () => {
    global.startDate = new Date();
    console.log(`Server in ascolto sulla porta 8000 started ${global.startDate.toLocaleString()}`);
});
