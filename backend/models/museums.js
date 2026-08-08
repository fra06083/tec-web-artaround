const mongoose = require('mongoose');

// 1. IL MUSEO (Il contenitore)
const museumSchema = new mongoose.Schema({
    museum: { type: String, required: true },
    city: { type: String, required: true },
    province: { type: String, required: true },
    region: { type: String, required: true },
    address: { type: String, required: true },
    description: String,
    image: String,
    // in museumSchema, dopo image
    mappa: {
        piante: [{ piano: Number, nome: String, immagine: String }],
        sale:   [{ nome: String, piano: Number, x: Number, y: Number, tipo: String }],
        poi:    [{ tipo: String, piano: Number, testo: String }]
    }
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
    sala: { nome:  String, piano: Number }
});
const visitSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Es. "I capolavori del Rinascimento"
    description: { type: String }, // Utile per la card nel marketplace
    image: String,
    museum_id: { type: mongoose.Schema.Types.ObjectId, ref: 'museum', required: true },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'item' }], // Sequenza degli oggetti da visitare 
    logistic_info: [{ type: String }], // Indicazioni tipo: "Entrata da Via Garibaldi, 2" 
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }, // Traccia il creatore (es. docente)
    tags: [{ type: String }], // Es. "Arte", "Storia", ecc.
    mnemonicCode: { type: String }, // Codice univoco facoltativo (es. "FeniceRossa")
    isPrivate: { type: Boolean, default: false } // Se true, non appare nel marketplace
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

// 4. LA DOMANDA QUIZ (Collegata alla visita)
const quizQuestionSchema = new mongoose.Schema({
    visit_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'visit', // Collega la domanda alla sua visita
        required: true
    },
    question: { type: String, required: true },
    options: {
        type: [String],
        required: true,
        validate: {
            validator: (arr) => arr.length >= 2,
            message: 'Servono almeno 2 opzioni di risposta'
        }
    },
    correctIndex: { type: Number, required: true }, // indice dell'opzione corretta in "options"
    order: { type: Number, default: 0 } // per ordinare le domande nel quiz
});

// 5. IL RISULTATO QUIZ (Punteggio di uno studente per una visita)
const quizResultSchema = new mongoose.Schema({
    visit_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'visit',
        required: true
    },
    studentName: { type: String, required: true },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    details: [{
        question_id: { type: mongoose.Schema.Types.ObjectId, ref: 'quizQuestion' },
        selectedIndex: Number,
        correct: Boolean
    }],
    date: { type: Date, default: Date.now }
});

const museum = mongoose.model('museum', museumSchema);
const item = mongoose.model('item', itemSchema);
const language = mongoose.model('language', languageSchema);
const visit = mongoose.model('visit', visitSchema);
const quizQuestion = mongoose.model('quizQuestion', quizQuestionSchema);
const quizResult = mongoose.model('quizResult', quizResultSchema);
// Esportiamo tutto correttamente
module.exports = { museum, item, visit, language, quizQuestion, quizResult };

