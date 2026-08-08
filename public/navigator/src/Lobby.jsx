import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getDarkMode } from './api';

export default function Lobby() {
    const navigate = useNavigate();
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    
    // Recupera PIN e visitId da URL o da sessionStorage (per recupero dopo refresh)
    const pin = query.get('pin') || sessionStorage.getItem('activeRoomPin');
    const visitId = query.get('visitId') || sessionStorage.getItem('activeRoomVisitId');
    const pending = query.get('pending');
    const reqId = query.get('reqId');
    
    const [students, setStudents] = useState([]);
    const [status, setStatus] = useState(pending ? 'In attesa di approvazione dal docente...' : 'In attesa del docente...');
    const [rejected, setRejected] = useState(false);
    const [darkMode, setDarkModeState] = useState(getDarkMode());

    useEffect(() => {
        const handleStorageChange = () => {
            const newDarkMode = getDarkMode();
            setDarkModeState(newDarkMode);
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const handleLeaveRoom = async () => {
        const studentName = localStorage.getItem('artaround_student_name');
        if (pin) {
            try {
                await fetch('/api/rooms/leave', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin, studentName })
                });
            } catch (e) {}
        }
        sessionStorage.removeItem('activeRoomPin');
        sessionStorage.removeItem('activeRoomVisitId');
        navigate('/');
    };

    useEffect(() => {
        if (window.hideMainLoader) window.hideMainLoader();
        
        if (!pin) {
            navigate('/');
            return;
        }

        // Salva in sessionStorage per recupero in caso di refresh
        sessionStorage.setItem('activeRoomPin', pin);
        if (visitId) sessionStorage.setItem('activeRoomVisitId', visitId);

        let eventSource = null;
        const studentName = localStorage.getItem('artaround_student_name') || '';

        fetch(`/api/rooms/check/${pin}`)
            .then(res => res.json())
            .then(data => {
                if (!data.exists) {
                    setStatus('La stanza non è più disponibile o il codice è errato.');
                    setRejected(true);
                    return;
                }

                const effectiveVisitId = visitId || data.visitId;

                // Se la visita e' gia' iniziata e lo studente non e' in attesa di approvazione
                if (data.isStarted && !pending && effectiveVisitId) {
                    setStatus('Visita già avviata! Sto caricando...');
                    navigate(`/visit/${effectiveVisitId}?pin=${pin}&index=${data.currentArtworkIndex || 0}`);
                    return;
                }

                const eventUrl = studentName ? `/api/rooms/events/${pin}?studentName=${encodeURIComponent(studentName)}` : `/api/rooms/events/${pin}`;
                eventSource = new EventSource(eventUrl);

                eventSource.addEventListener('connected', (e) => {
                    const parsed = JSON.parse(e.data);
                    setStudents(parsed.students || []);
                    if (parsed.isStarted && !pending && (visitId || parsed.visitId)) {
                        setStatus('Visita avviata! Sto caricando...');
                        eventSource.close();
                        navigate(`/visit/${visitId || parsed.visitId}?pin=${pin}&index=${parsed.currentArtworkIndex || 0}`);
                    }
                });

                eventSource.addEventListener('student-joined', (e) => {
                    const parsed = JSON.parse(e.data);
                    setStudents(parsed.students || []);
                });

                eventSource.addEventListener('visit-started', (e) => {
                    if (!pending && (visitId || data.visitId)) {
                        setStatus('Visita avviata! Sto caricando...');
                        eventSource.close();
                        navigate(`/visit/${visitId || data.visitId}?pin=${pin}`);
                    }
                });

                eventSource.addEventListener('join-accepted', (e) => {
                    const parsed = JSON.parse(e.data);
                    if (pending && parsed.reqId === reqId) {
                        setStatus('Richiesta approvata! Sto caricando...');
                        eventSource.close();
                        navigate(`/visit/${parsed.visitId || visitId}?pin=${pin}&index=${parsed.currentArtworkIndex !== undefined ? parsed.currentArtworkIndex : 0}`);
                    }
                });

                eventSource.addEventListener('join-rejected', (e) => {
                    const parsed = JSON.parse(e.data);
                    if (pending && parsed.reqId === reqId) {
                        setStatus('La tua richiesta è stata rifiutata.');
                        setRejected(true);
                        eventSource.close();
                    }
                });

                eventSource.addEventListener('room-ended', () => {
                    setStatus('La visita è stata terminata dal docente.');
                    setRejected(true);
                    if (eventSource) eventSource.close();
                });

                eventSource.onerror = () => {
                    // Tenta il riconnesione automatica tramite SSE standard
                };
            })
            .catch(() => {
                setStatus('Errore di connessione al server.');
                setRejected(true);
            });

        return () => {
            if (eventSource) eventSource.close();
        };
    }, [pin, visitId, pending, reqId, navigate]);

    return (
        <div className={`container-fluid min-vh-100 d-flex flex-column justify-content-center align-items-center p-3 transition-theme ${darkMode ? 'bg-black text-white' : 'marketplace-light text-dark'}`}>
            <div className="text-center w-100 max-w-600">
                <div className="badge bg-orange text-white px-3 py-2 rounded-pill mb-3 fw-bold text-uppercase tracking-wider fs-075 shadow-sm">
                    Lobby d'Attesa
                </div>
                <h1 className="fw-black mb-3">Sei nella Sala d'Attesa</h1>
                <p className={`lead mb-4 ${darkMode ? 'opacity-75 text-white' : 'text-secondary'}`}>
                    Stanza Live: <span className="fw-bold text-orange">{pin}</span>
                </p>
                
                <div className={`p-4 rounded-4 mb-4 shadow-sm border ${darkMode ? 'bg-dark border-secondary border-opacity-25 text-white' : 'bg-white border-light-subtle text-dark'}`}>
                    <h4 className="fw-bold mb-0">{status}</h4>
                </div>

                {rejected ? (
                    <button onClick={() => navigate('/')} className="btn bg-orange text-white rounded-pill px-4 py-2.5 fw-bold shadow-sm active-scale">
                        Torna alla Home Navigator
                    </button>
                ) : (
                    <div className="d-flex flex-column align-items-center gap-4">
                        {!pending && (
                            <div className={`card shadow-sm border rounded-4 w-100 max-w-450 ${darkMode ? 'border-secondary border-opacity-25 bg-dark text-white' : 'border-light-subtle bg-white text-dark'}`}>

                                <div className="card-body p-4">
                                    <h6 className="fw-bold mb-3 text-uppercase text-orange tracking-wider fs-075">
                                        <i className="bi bi-people-fill me-2"></i>Partecipanti Connessi ({students.length})
                                    </h6>
                                    <div className="d-flex flex-wrap justify-content-center gap-2 max-h-200 overflow-y-auto p-1">
                                        {students.map((s, idx) => (
                                            <span key={idx} className={`badge px-3 py-2 rounded-pill fs-6 fw-medium d-flex align-items-center gap-1.5 ${darkMode ? 'bg-secondary bg-opacity-50 text-white border border-secondary border-opacity-25' : 'bg-light text-dark border border-light-subtle shadow-sm'}`}>
                                                <i className="bi bi-person-circle small text-orange"></i> {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={handleLeaveRoom}
                            className="btn btn-outline-danger rounded-pill px-4 py-2 fw-bold small opacity-75 hover-opacity-100 transition-all"
                        >
                            <i className="bi bi-box-arrow-left me-1.5"></i> Esci dalla Stanza
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}


