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
        students: [], // contiene i nomi degli studenti per mostrarli nella lobby
        isStarted: false,
        allowLateJoins: req.body.allowLateJoins !== false, // default true
        pendingRequests: new Map() // reqId -> studentName
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
    
    if (room.isStarted) {
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

    res.json({ success: true, visitId: room.visitId, currentArtworkIndex: room.currentArtworkIndex });
});

// Verifica esistenza stanza
router.get('/check/:pin', (req, res) => {
    if (activeRooms.has(req.params.pin)) {
        res.json({ exists: true });
    } else {
        res.json({ exists: false });
    }
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

module.exports = router;
