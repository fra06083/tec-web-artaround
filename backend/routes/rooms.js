const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { quizQuestion: QuizQuestion, quizResult: QuizResult, visit: Visit } = require('../models/museums.js');

// Memoria RAM per le stanze
// Struttura: { [pin]: { visitId, teacherId, currentArtworkIndex, clients: [] } }
const activeRooms = new Map();

// Helper per inviare eventi a tutti i client di una stanza
const broadcastToRoom = (pin, eventName, data) => {
    const room = activeRooms.get(pin);
    if (!room) return;
    
    room.clients.forEach(client => {
        client.res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    });
};

// Crea una nuova stanza
router.post('/create', async (req, res) => {
    const { visitId, teacherId } = req.body;
    
    if (!visitId) {
        return res.status(400).json({ error: "visitId è obbligatorio" });
    }

    let pin;
    
    try {
        const visit = await Visit.findById(visitId);
        if (visit && visit.mnemonicCode && visit.mnemonicCode.trim() !== '') {
            pin = visit.mnemonicCode.trim();
            if (activeRooms.has(pin)) {
                return res.status(409).json({ error: "Questo codice è già in uso, scegline uno diverso." });
            }
        }
    } catch (err) {
        console.error("Errore nel recupero della visita per mnemonicCode:", err);
    }

    if (!pin) {
        // Fallback: Genera PIN univoco di 5 cifre
        do {
            pin = Math.floor(10000 + Math.random() * 90000).toString();
        } while (activeRooms.has(pin));
    }

    activeRooms.set(pin, {
        visitId,
        teacherId: teacherId || null,
        currentArtworkIndex: 0,
        clients: [],
        students: [],
        isStarted: false,
        allowLateJoins: req.body.allowLateJoins !== false,
        pendingRequests: new Map(),
        // --- NUOVO: stato quiz ---
        quizActive: false,
        quizQuestions: [],   // copia completa (con correctIndex), solo server-side
        quizAnswers: {},     // { studentName: { [questionId]: selectedIndex } }
        quizResults: null    // array dei risultati calcolati a fine quiz
    });

    console.log(`Stanza creata: ${pin} per visita ${visitId}`);
    res.json({ pin, visitId });
});

// Studente si unisce a una stanza (chiamata REST iniziale)
router.post('/join', async (req, res) => {
    let { pin, studentName } = req.body;
    if (!pin || !pin.trim()) {
        return res.status(400).json({ error: "PIN o Codice Stanza obbligatorio" });
    }

    pin = pin.trim();

    if (!activeRooms.has(pin)) {
        return res.status(404).json({ error: "Stanza o Codice non trovato. Verifica il codice e riprova." });
    }

    const room = activeRooms.get(pin);
    const isAlreadyMember = studentName && room.students.includes(studentName);
    
    if (room.isStarted && !isAlreadyMember) {
        if (!room.allowLateJoins) {
            return res.status(403).json({ error: "La visita è già iniziata e non sono ammessi nuovi ingressi." });
        }
        
        const reqId = crypto.randomUUID();
        room.pendingRequests.set(reqId, studentName);
        
        broadcastToRoom(pin, 'join-request', { reqId, studentName });
        
        return res.json({ requiresApproval: true, reqId, visitId: room.visitId });
    }

    // Aggiungi nome studente alla lista
    if (studentName && !room.students.includes(studentName)) {
        room.students.push(studentName);
        // Avvisa la lobby (docente)
        broadcastToRoom(pin, 'student-joined', { students: room.students });
        broadcastToRoom(pin, 'chat-message', { sender: 'Sistema', message: `${studentName} si è unito alla stanza.`, type: 'system', timestamp: new Date().toISOString() });
    }

    res.json({ success: true, visitId: room.visitId, currentArtworkIndex: room.currentArtworkIndex, isStarted: room.isStarted });
});

// Verifica esistenza stanza o codice mnemonic
router.get('/check/:pin', async (req, res) => {
    const pin = (req.params.pin || '').trim();
    if (activeRooms.has(pin)) {
        const room = activeRooms.get(pin);
        return res.json({ 
            exists: true, 
            visitId: room.visitId, 
            isStarted: room.isStarted, 
            currentArtworkIndex: room.currentArtworkIndex 
        });
    }
    try {
        const matchedVisit = await Visit.findOne({ 
            mnemonicCode: { $regex: new RegExp('^' + pin + '$', 'i') } 
        });
        if (matchedVisit) {
            return res.json({ exists: true, visitId: matchedVisit._id, isStarted: false });
        }
    } catch (e) {}
    res.json({ exists: false });
});

// Connessione SSE per ascoltare gli eventi della stanza
router.get('/events/:pin', (req, res) => {
    const { pin } = req.params;
    const studentName = req.query.studentName;

    if (!activeRooms.has(pin)) {
        return res.status(404).json({ error: "Stanza non trovata" });
    }

    // Header necessari per SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const room = activeRooms.get(pin);

    if (studentName && studentName.trim()) {
        const name = studentName.trim();
        if (!room.students.includes(name)) {
            room.students.push(name);
            broadcastToRoom(pin, 'student-joined', { students: room.students });
        }
    }
    
    // Identificativo client
    const clientId = crypto.randomUUID();
    const newClient = { id: clientId, res, studentName };
    room.clients.push(newClient);

    // Invia lo stato iniziale COMPLETO
    res.write(`event: connected\ndata: ${JSON.stringify({ 
        message: "Connesso alla stanza", 
        students: room.students, 
        currentArtworkIndex: room.currentArtworkIndex,
        isStarted: room.isStarted,
        visitId: room.visitId
    })}\n\n`);

    // Ping periodico per tenere viva la connessione dietro al reverse proxy
    const pingInterval = setInterval(() => {
        res.write(':\n\n');
    }, 25000);

    // Gestione disconnessione
    req.on('close', () => {
        clearInterval(pingInterval);
        room.clients = room.clients.filter(c => c.id !== clientId);
    });
});

// Studente o docente lascia la stanza
router.post('/leave', (req, res) => {
    const { pin, studentName } = req.body;
    if (!activeRooms.has(pin)) {
        return res.json({ success: true });
    }
    const room = activeRooms.get(pin);
    if (studentName) {
        room.students = room.students.filter(s => s !== studentName);
        broadcastToRoom(pin, 'student-joined', { students: room.students });
        broadcastToRoom(pin, 'chat-message', { sender: 'Sistema', message: `${studentName} ha lasciato la stanza.`, type: 'system', timestamp: new Date().toISOString() });
    }
    res.json({ success: true });
});


// Docente cambia opera
router.post('/change-artwork', (req, res) => {
    const { pin, artworkIndex } = req.body;

    if (!activeRooms.has(pin)) {
        return res.status(404).json({ error: "Stanza non trovata" });
    }

    const room = activeRooms.get(pin);
    room.currentArtworkIndex = artworkIndex;

    // Broadcast a tutti gli studenti
    broadcastToRoom(pin, 'artwork-changed', { artworkIndex });

    res.json({ success: true });
});

// Docente avvia la visita
router.post('/start', (req, res) => {
    const { pin } = req.body;

    if (!activeRooms.has(pin)) {
        return res.status(404).json({ error: "Stanza non trovata" });
    }

    const room = activeRooms.get(pin);
    room.isStarted = true;

    broadcastToRoom(pin, 'visit-started', { message: "La visita è iniziata" });
    broadcastToRoom(pin, 'chat-message', { sender: 'Sistema', message: `La visita è iniziata.`, type: 'system', timestamp: new Date().toISOString() });
    res.json({ success: true });
});

// Accetta richiesta di join
router.post('/accept-join', (req, res) => {
    const { pin, reqId } = req.body;
    const room = activeRooms.get(pin);
    
    if (!room || !room.pendingRequests.has(reqId)) {
        return res.status(404).json({ error: "Richiesta non trovata" });
    }
    
    const studentName = room.pendingRequests.get(reqId);
    room.pendingRequests.delete(reqId);
    
    if (!room.students.includes(studentName)) {
        room.students.push(studentName);
    }
    
    broadcastToRoom(pin, 'join-accepted', { reqId, studentName, visitId: room.visitId, currentArtworkIndex: room.currentArtworkIndex });
    res.json({ success: true });
});

// Rifiuta richiesta di join
router.post('/reject-join', (req, res) => {
    const { pin, reqId } = req.body;
    const room = activeRooms.get(pin);
    
    if (!room || !room.pendingRequests.has(reqId)) {
        return res.status(404).json({ error: "Richiesta non trovata" });
    }
    
    room.pendingRequests.delete(reqId);
    
    broadcastToRoom(pin, 'join-rejected', { reqId });
    res.json({ success: true });
});

// Invia messaggio in chat
router.post('/chat', (req, res) => {
    const { pin, sender, message, type } = req.body;
    
    if (!activeRooms.has(pin)) {
        return res.status(404).json({ error: "Stanza non trovata" });
    }
    
    broadcastToRoom(pin, 'chat-message', { sender, message, type: type || 'user', timestamp: new Date().toISOString() });
    res.json({ success: true });
});

// Notifica azione studente (+, -, audio)
router.post('/student-action', (req, res) => {
    const { pin, studentName, action } = req.body;
    if (!activeRooms.has(pin)) {
        return res.status(404).json({ error: "Stanza non trovata" });
    }
    broadcastToRoom(pin, 'student-action', { studentName, action });
    res.json({ success: true });
});

// Broadcast audio a tutti gli studenti
router.post('/broadcast-audio', (req, res) => {
    const { pin, text } = req.body;
    if (!activeRooms.has(pin)) {
        return res.status(404).json({ error: "Stanza non trovata" });
    }
    broadcastToRoom(pin, 'broadcast-audio', { text });
    res.json({ success: true });
});

// Termina la visita e chiude la stanza
router.post('/end', (req, res) => {
    const { pin } = req.body;
    if (!activeRooms.has(pin)) {
        return res.status(404).json({ error: "Stanza non trovata" });
    }
    
    // Avvisa tutti i client che la stanza è chiusa
    broadcastToRoom(pin, 'room-ended', { message: "La visita è terminata." });
    
    // Elimina la stanza dalla memoria
    activeRooms.delete(pin);
    
    res.json({ success: true });
});

// Docente avvia il quiz di fine visita
router.post('/quiz/start', async (req, res) => {
    const { pin } = req.body;
    const room = activeRooms.get(pin);
    if (!room) return res.status(404).json({ error: "Stanza non trovata" });

    try {
        const questions = await QuizQuestion.find({ visit_id: room.visitId }).sort({ order: 1 }).lean();
        if (questions.length === 0) {
            return res.status(400).json({ error: "Nessuna domanda quiz disponibile per questa visita" });
        }

        room.quizQuestions = questions;
        room.quizAnswers = {};
        room.quizResults = null;
        room.quizActive = true;

        // Versione senza risposta corretta, da mandare agli studenti
        const sanitized = questions.map(q => ({ _id: q._id, question: q.question, options: q.options }));
        broadcastToRoom(pin, 'quiz-started', { questions: sanitized });

        res.json({ success: true, questionCount: questions.length });
    } catch (err) {
        console.error("Errore avvio quiz:", err);
        res.status(500).json({ error: "Errore interno del server" });
    }
});

// Studente invia le risposte
router.post('/quiz/answer', (req, res) => {
    const { pin, studentName, answers } = req.body; // answers: { [questionId]: selectedIndex }

    const room = activeRooms.get(pin);
    if (!room) return res.status(404).json({ error: "Stanza non trovata" });
    if (!room.quizActive) return res.status(400).json({ error: "Il quiz non è attivo" });

    room.quizAnswers[studentName] = answers;
    broadcastToRoom(pin, 'quiz-student-submitted', { studentName });

    res.json({ success: true });
});

// Docente termina il quiz: calcola i punteggi, li salva nel DB, li invia a tutti
router.post('/quiz/finish', async (req, res) => {
    const { pin } = req.body;
    const room = activeRooms.get(pin);
    if (!room) return res.status(404).json({ error: "Stanza non trovata" });

    try {
        const total = room.quizQuestions.length;
        const results = [];

        for (const [studentName, answers] of Object.entries(room.quizAnswers)) {
            let score = 0;
            const details = room.quizQuestions.map(q => {
                const selectedIndex = answers ? answers[q._id.toString()] : undefined;
                const correct = selectedIndex === q.correctIndex;
                if (correct) score++;
                return { question_id: q._id, selectedIndex, correct };
            });

            results.push({ studentName, score, total, details });

            await QuizResult.create({
                visit_id: room.visitId,
                studentName,
                score,
                total,
                details
            });
        }

        // Studenti connessi che non hanno risposto: punteggio 0
        room.students.forEach(name => {
            if (!room.quizAnswers[name]) {
                results.push({ studentName: name, score: 0, total, details: [] });
            }
        });

        room.quizActive = false;
        room.quizResults = results;

        broadcastToRoom(pin, 'quiz-results', { results });

        res.json({ success: true, results });
    } catch (err) {
        console.error("Errore chiusura quiz:", err);
        res.status(500).json({ error: "Errore interno del server" });
    }
});

module.exports = router;
