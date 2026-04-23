const mongoose = require('mongoose');

// 1. IL MUSEO (Il contenitore)
const museumSchema = new mongoose.Schema({
    museum: { type: String, required: true },
    city: { type: String, required: true },
    provence: { type: String, required: true },
    region: { type: String, required: true },
    description: String,
    image: String
});
// 2. L'OPERA (Contenuta nel museo)
const itemSchema = new mongoose.Schema({
    item: { type: String, required: true, unique: true },
    img_path: { type: String, required: true },
    museum_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'museum', // Collega l'opera al suo museo
        required: true
    },
    author: { type: String, required: true }, // Metadato obbligatorio [cite: 268]
    license: { type: String, required: true }, // Metadato obbligatorio [cite: 269]
});
const visitSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Es. "I capolavori del Rinascimento"
    description: { type: String }, // Utile per la card nel marketplace
    museum_id: { type: mongoose.Schema.Types.ObjectId, ref: 'museum', required: true },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'item' }], // Sequenza degli oggetti da visitare 
    logistic_info: [{ type: String }] // Indicazioni tipo: "Entrata da Via Garibaldi, 2" 
});
// 3. IL DIALOGO (Collegato all'opera)
const languageSchema = new mongoose.Schema({
    type: { type: String, enum: ['infantile', 'semplice', 'medio', 'dettagliato'], required: true },
    text: { type: String, required: true },
    length: { type: String, required: true },
    item_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'item', // Collega il testo all'opera
        required: true
    }
});

const museum = mongoose.model('museum', museumSchema);
const item = mongoose.model('item', itemSchema);
const language = mongoose.model('language', languageSchema);
const visit = mongoose.model('visit', visitSchema);
// Esportiamo tutto correttamente
module.exports = { museum, item, visit, language };
