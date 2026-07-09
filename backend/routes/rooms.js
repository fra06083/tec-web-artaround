const express = require('express');
const router = express.Router();
const crypto = require('crypto');

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
router.post('/create', (req, res) => {
    const { visitId, teacherId } = req.body;
    
    if (!visitId) {
        return res.status(400).json({ error: "visitId è obbligatorio" });
    }

    // Genera PIN univoco di 5 cifre
    let pin;
    do {
        pin = Math.floor(10000 + Math.random() * 90000).toString();
    } while (activeRooms.has(pin));

    activeRooms.set(pin, {
        visitId,
        teacherId: teacherId || null,
        currentArtworkIndex: 0,
        clients: [], // conterranno gli oggetti response per SSE
        students: [] // contiene i nomi degli studenti per mostrarli nella lobby
    });

    console.log(`Stanza creata: ${pin} per visita ${visitId}`);
    res.json({ pin, visitId });
});

// Studente si unisce a una stanza (chiamata REST iniziale)
router.post('/join', (req, res) => {
    const { pin, studentName } = req.body;

    if (!activeRooms.has(pin)) {
        return res.status(404).json({ error: "Stanza non trovata" });
    }

    const room = activeRooms.get(pin);
    
    // Aggiungi nome studente alla lista
    if (studentName && !room.students.includes(studentName)) {
        room.students.push(studentName);
        // Avvisa la lobby (docente)
        broadcastToRoom(pin, 'student-joined', { students: room.students });
    }

    res.json({ success: true, visitId: room.visitId, currentArtworkIndex: room.currentArtworkIndex });
});

// Connessione SSE per ascoltare gli eventi della stanza
router.get('/events/:pin', (req, res) => {
    const { pin } = req.params;

    if (!activeRooms.has(pin)) {
        return res.status(404).json({ error: "Stanza non trovata" });
    }

    // Header necessari per SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // flush headers
    res.flushHeaders();

    const room = activeRooms.get(pin);
    
    // Identificativo client
    const clientId = crypto.randomUUID();
    const newClient = { id: clientId, res };
    room.clients.push(newClient);

    // Invia lo stato iniziale
    res.write(`event: connected\ndata: ${JSON.stringify({ message: "Connesso alla stanza", students: room.students, currentArtworkIndex: room.currentArtworkIndex })}\n\n`);

    // Gestione disconnessione
    req.on('close', () => {
        room.clients = room.clients.filter(c => c.id !== clientId);
        // Se non ci sono più client, e la visita è finita? Potremmo rimuovere la stanza dopo tot tempo
    });
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

    broadcastToRoom(pin, 'visit-started', { message: "La visita è iniziata" });
    res.json({ success: true });
});

module.exports = router;
