const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { quizQuestion: QuizQuestion, quizResult: QuizResult, visit: Visit } = require('../models/museums.js');

const activeRooms = new Map();

const broadcastToRoom = (pin, eventName, data) => {
    const room = activeRooms.get(pin);
    if (!room) return;
    
    room.clients.forEach(client => {
        client.res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    });
};

router.post('/create', async (req, res) => {
    const { visitId, teacherId } = req.body;
    
    if (!visitId) {
        return res.status(400).json({ error: "visitId è obbligatorio" });
    }

// Se lo stesso docente ricrea la stanza per la stessa visita, riusiamo quella attiva senza duplicarla
    if (teacherId) {
        for (const [p, r] of activeRooms.entries()) {
            if (r.visitId.toString() === visitId.toString() && r.teacherId === teacherId) {
                if (r.clients.length === 0 && !r.isStarted) {
                    r.students = [];
                    r.currentArtworkIndex = 0;
                }
                return res.json({ 
                    pin: p, 
                    visitId: r.visitId,
                    isStarted: r.isStarted,
                    currentArtworkIndex: r.currentArtworkIndex || 0,
                    isCustomPassword: Boolean(r.baseCode)
                });
            }
        }
    }

    let basePin = '';
    let visit = null;
    
    try {
        visit = await Visit.findById(visitId);
        if (visit && visit.mnemonicCode && visit.mnemonicCode.trim() !== '') {
            basePin = visit.mnemonicCode.trim();
        }
    } catch (err) {
        console.error("Errore nel recupero della visita per mnemonicCode:", err);
    }

    let pin = basePin;

    // Se il codice mnemonic è già occupato da un'altra stanza, aggiungiamo un numero progressivo (es. ciao1, ciao2)
    if (basePin) {
        if (activeRooms.has(pin)) {
            let counter = 1;
            while (activeRooms.has(basePin + counter)) {
                counter++;
            }
            pin = basePin + counter;
        }
    } else {
        do {
            pin = Math.floor(10000 + Math.random() * 90000).toString();
        } while (activeRooms.has(pin));
    }

    activeRooms.set(pin, {
        visitId,
        teacherId: teacherId || null,
        baseCode: basePin || null,
        currentArtworkIndex: 0,
        clients: [],
        students: [],
        isStarted: false,
        allowLateJoins: req.body.allowLateJoins !== false,
        pendingRequests: new Map(),
        quizActive: false,
        quizQuestions: [],
        quizAnswers: {},
        quizResults: null
    });

    console.log(`[ROOM] Stanza creata con PIN: ${pin} (docente: ${teacherId}) per visita: ${visitId}`);
    res.json({ 
        pin, 
        visitId, 
        isCustomPassword: Boolean(basePin)
    });
});

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

    if (studentName && !room.students.includes(studentName)) {
        room.students.push(studentName);
        broadcastToRoom(pin, 'student-joined', { students: room.students });
        broadcastToRoom(pin, 'chat-message', { sender: 'Sistema', message: `${studentName} si è unito alla stanza.`, type: 'system', timestamp: new Date().toISOString() });
    }

    res.json({ success: true, visitId: room.visitId, currentArtworkIndex: room.currentArtworkIndex, isStarted: room.isStarted });
});

router.get('/active', (req, res) => {
    const activeMap = {};
    const targetTeacherId = req.query.teacherId || null;

    for (const [pin, room] of activeRooms.entries()) {
        if (room.visitId) {
            const vid = room.visitId.toString();
            if (!activeMap[vid] || (targetTeacherId && room.teacherId === targetTeacherId)) {
                activeMap[vid] = {
                    pin: pin,
                    teacherId: room.teacherId,
                    isStarted: room.isStarted,
                    studentsCount: room.students ? room.students.length : 0,
                    currentArtworkIndex: room.currentArtworkIndex || 0
                };
            }
        }
    }
    res.json(activeMap);
});

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

router.get('/events/:pin', (req, res) => {
    const { pin } = req.params;

    if (!activeRooms.has(pin)) {
        return res.status(404).json({ error: "Stanza non trovata" });
    }

    // Disabilita il buffering per far funzionare lo streaming SSE anche sotto Nginx/reverse proxy
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const room = activeRooms.get(pin);

    const clientId = crypto.randomUUID();
    const studentName = req.query.studentName;
    const newClient = { id: clientId, res, studentName };
    room.clients.push(newClient);

    if (studentName && studentName.trim() !== '') {
        const name = studentName.trim();
        if (!room.students.includes(name)) {
            room.students.push(name);
            broadcastToRoom(pin, 'student-joined', { students: room.students });
        }
    }

    res.write(`event: connected\ndata: ${JSON.stringify({ 
        message: "Connesso alla stanza", 
        students: room.students, 
        currentArtworkIndex: room.currentArtworkIndex,
        isStarted: room.isStarted,
        visitId: room.visitId
    })}\n\n`);

    // Ping periodico per evitare il timeout del socket con i proxy intermedi
    const pingInterval = setInterval(() => {
        res.write(':\n\n');
    }, 25000);

    // Quando il client chiude la connessione, rimuoviamo lo studente solo se non ha altre schede aperte
    req.on('close', () => {
        clearInterval(pingInterval);
        const clientIndex = room.clients.findIndex(c => c.id === clientId);
        if (clientIndex !== -1) {
            const client = room.clients[clientIndex];
            room.clients.splice(clientIndex, 1);
            if (client.studentName) {
                const hasOtherConnections = room.clients.some(c => c.studentName === client.studentName);
                if (!hasOtherConnections) {
                    room.students = room.students.filter(s => s !== client.studentName);
                    broadcastToRoom(pin, 'student-joined', { students: room.students });
                }
            }
        }
    });
});

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

router.post('/change-artwork', (req, res) => {
    const { pin, artworkIndex } = req.body;

    if (!activeRooms.has(pin)) {
        return res.status(404).json({ error: "Stanza non trovata" });
    }

    const room = activeRooms.get(pin);
    room.currentArtworkIndex = artworkIndex;

    broadcastToRoom(pin, 'artwork-changed', { artworkIndex });

    res.json({ success: true });
});

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

router.post('/chat', (req, res) => {
    const { pin, sender, message, type } = req.body;
    
    if (!activeRooms.has(pin)) {
        return res.status(404).json({ error: "Stanza non trovata" });
    }
    
    broadcastToRoom(pin, 'chat-message', { sender, message, type: type || 'user', timestamp: new Date().toISOString() });
    res.json({ success: true });
});

router.post('/student-action', (req, res) => {
    const { pin, studentName, action } = req.body;
    if (!activeRooms.has(pin)) {
        return res.status(404).json({ error: "Stanza non trovata" });
    }
    broadcastToRoom(pin, 'student-action', { studentName, action });
    res.json({ success: true });
});

router.post('/broadcast-audio', (req, res) => {
    const { pin, text } = req.body;
    if (!activeRooms.has(pin)) {
        return res.status(404).json({ error: "Stanza non trovata" });
    }
    broadcastToRoom(pin, 'broadcast-audio', { text });
    res.json({ success: true });
});

router.post('/end', (req, res) => {
    const { pin, visitId, teacherId } = req.body;
    let targetPin = null;

    if (pin && String(pin).trim()) {
        const cleanPin = String(pin).trim().toLowerCase();
        for (const [p, r] of activeRooms.entries()) {
            if (p.toLowerCase() === cleanPin) {
                targetPin = p;
                break;
            }
        }
    } else if (visitId) {
        for (const [p, r] of activeRooms.entries()) {
            if (r.visitId.toString() === visitId.toString() && (!teacherId || r.teacherId === teacherId)) {
                targetPin = p;
                break;
            }
        }
    }

    if (!targetPin || !activeRooms.has(targetPin)) {
        return res.status(404).json({ error: "Stanza non trovata" });
    }
    
    broadcastToRoom(targetPin, 'room-ended', { message: "La visita è terminata." });
    broadcastToRoom(targetPin, 'room-closed', { message: "Il docente ha terminato la visita." });
    
    activeRooms.delete(targetPin);
    console.log(`Stanza terminata ed eliminata: ${targetPin}`);
    
    res.json({ success: true });
});

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

        const sanitized = questions.map(q => ({ _id: q._id, question: q.question, options: q.options }));
        broadcastToRoom(pin, 'quiz-started', { questions: sanitized });

        res.json({ success: true, questionCount: questions.length });
    } catch (err) {
        console.error("Errore avvio quiz:", err);
        res.status(500).json({ error: "Errore interno del server" });
    }
});

router.post('/quiz/answer', (req, res) => {
    const { pin, studentName, answers } = req.body;

    const room = activeRooms.get(pin);
    if (!room) return res.status(404).json({ error: "Stanza non trovata" });
    if (!room.quizActive) return res.status(400).json({ error: "Il quiz non è attivo" });

    room.quizAnswers[studentName] = answers;
    broadcastToRoom(pin, 'quiz-student-submitted', { studentName });

    res.json({ success: true });
});

router.post('/quiz/finish', async (req, res) => {
    const { pin } = req.body;
    const room = activeRooms.get(pin);
    if (!room) return res.status(404).json({ error: "Stanza non trovata" });

    try {
        const total = room.quizQuestions.length;
        const results = [];
        const processedStudents = new Set();

        // Process students who submitted draft or final answers
        if (room.quizAnswers) {
            for (const [studentName, answers] of Object.entries(room.quizAnswers)) {
                if (!studentName) continue;
                processedStudents.add(studentName);
                let score = 0;
                const details = room.quizQuestions.map(q => {
                    const qIdStr = q._id ? q._id.toString() : '';
                    const rawSelected = answers ? (answers[qIdStr] !== undefined ? answers[qIdStr] : answers[q._id]) : undefined;
                    const selectedIndex = (rawSelected !== undefined && rawSelected !== null && rawSelected !== '') ? Number(rawSelected) : null;
                    const correct = (selectedIndex !== null && !isNaN(selectedIndex) && selectedIndex === Number(q.correctIndex));
                    if (correct) score++;
                    return { question_id: qIdStr, selectedIndex, correct };
                });

                results.push({ studentName, score, total, details });

                try {
                    await QuizResult.create({
                        visit_id: room.visitId,
                        studentName,
                        score,
                        total,
                        details
                    });
                } catch (dbErr) {
                    console.error("Errore salvataggio DB QuizResult:", dbErr);
                }
            }
        }

        // Process students in room who haven't submitted any answer
        if (room.students) {
            room.students.forEach(name => {
                if (name && !processedStudents.has(name)) {
                    processedStudents.add(name);
                    const details = room.quizQuestions.map(q => ({
                        question_id: q._id ? q._id.toString() : '',
                        selectedIndex: null,
                        correct: false
                    }));
                    results.push({ studentName: name, score: 0, total, details });
                }
            });
        }

        const questionsData = room.quizQuestions.map(q => ({
            _id: q._id ? q._id.toString() : '',
            question: q.question,
            options: q.options,
            correctIndex: Number(q.correctIndex)
        }));

        room.quizActive = false;
        room.quizResults = results;

        broadcastToRoom(pin, 'quiz-results', { results, questions: questionsData });

        res.json({ success: true, results, questions: questionsData });
    } catch (err) {
        console.error("Errore chiusura quiz:", err);
        res.status(500).json({ error: "Errore interno del server" });
    }
});

module.exports = router;
