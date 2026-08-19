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

                const studentName = sessionStorage.getItem('studentName') || '';
                eventSource = new EventSource(`/api/rooms/events/${pin}?studentName=${encodeURIComponent(studentName)}`);

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

    const [preferredLevel, setPreferredLevel] = useState(() => localStorage.getItem('artaround_preferred_level') || 'medio');

    const handleLevelChange = (e) => {
        const newLevel = e.target.value;
        setPreferredLevel(newLevel);
        localStorage.setItem('artaround_preferred_level', newLevel);
    };

    return (
        <div className={`container-fluid min-vh-100 d-flex flex-column justify-content-center align-items-center p-3 p-md-5 transition-theme position-relative overflow-hidden ${darkMode ? 'bg-black text-white' : 'marketplace-light text-dark'}`}>
            
            <div className="position-absolute top-50 start-50 translate-middle w-100 h-100 d-none d-md-block opacity-10 pointer-events-none ambient-glow-orange"></div>

            <div className="text-center w-100 max-w-600 position-relative z-1">
                
                <div className="d-inline-flex align-items-center gap-2 bg-orange bg-opacity-15 text-orange px-3.5 py-2 rounded-pill mb-4 fw-bold text-uppercase tracking-wider fs-075 border border-orange border-opacity-25 shadow-sm">
                    <span className="spinner-grow spinner-grow-sm text-orange" role="status" aria-hidden="true"></span>
                    <span>Sala d'Attesa Live</span>
                </div>

                <h1 className="fw-black mb-2 display-6 tracking-tight">Sei nella Sala d'Attesa</h1>
                <p className={`lead mb-4 ${darkMode ? 'text-white-50' : 'text-secondary'}`}>
                    Codice Stanza: <span className="fw-black text-orange border-bottom border-orange border-opacity-50 pb-0.5 px-1">{pin}</span>
                </p>
                
                <div className={`p-4 rounded-4 mb-4 shadow-md border position-relative overflow-hidden ${darkMode ? 'bg-dark bg-opacity-80 border-secondary border-opacity-25 text-white' : 'bg-white border-light-subtle text-dark'}`}>
                    <div className="d-flex align-items-center justify-content-center gap-3">
                        {!rejected && (
                            <div className="spinner-border text-orange spinner-border-sm flex-shrink-0" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        )}
                        <h5 className="fw-bold mb-0 lh-base">{status}</h5>
                    </div>
                </div>

                {!rejected && (
                    <div className={`card shadow-sm border rounded-4 w-100 max-w-450 mx-auto mb-4 ${darkMode ? 'border-secondary border-opacity-25 bg-dark text-white' : 'border-light-subtle bg-white text-dark'}`}>
                        <div className="card-body p-4 text-start">
                            <label className="form-label fw-bold text-uppercase text-orange tracking-wider fs-075 d-flex align-items-center gap-2 mb-2">
                                <i className="bi bi-sliders text-orange fs-6"></i> Livello di Testo Preferito
                            </label>
                            <select 
                                className={`form-select rounded-3 py-2.5 fw-bold ${darkMode ? 'bg-dark text-white border-secondary border-opacity-50' : 'bg-light text-dark border-light-subtle'}`}
                                value={preferredLevel}
                                onChange={handleLevelChange}
                            >
                                <option value="infantile">Infantile (Semplificato per bambini)</option>
                                <option value="semplice">Semplice (Linguaggio intuitivo)</option>
                                <option value="medio">Medio (Standard bilanciato)</option>
                                <option value="dettagliato">Dettagliato (Approfondito completo)</option>
                            </select>
                            <div className="form-text small opacity-75 mt-2">
                                Puoi personalizzare il tuo livello di spiegazione direttamente qui prima dell'avvio della visita.
                            </div>
                        </div>
                    </div>
                )}

                {rejected ? (
                    <button onClick={() => navigate('/')} className="btn bg-orange text-white rounded-pill px-4 py-2.5 fw-bold shadow-sm active-scale">
                        <i className="bi bi-house-door-fill me-2"></i> Torna alla Home Navigator
                    </button>
                ) : (
                    <div className="d-flex flex-column align-items-center gap-4">
                        {!pending && (
                            <div className={`card shadow-sm border rounded-4 w-100 max-w-450 ${darkMode ? 'border-secondary border-opacity-25 bg-dark text-white' : 'border-light-subtle bg-white text-dark'}`}>
                                <div className="card-body p-4">
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="fw-bold mb-0 text-uppercase text-orange tracking-wider fs-075 d-flex align-items-center gap-2">
                                            <i className="bi bi-people-fill fs-6"></i> Partecipanti Connessi
                                        </h6>
                                        <span className="badge rounded-pill bg-orange bg-opacity-15 text-orange fw-bold fs-7 px-2.5 py-1">
                                            {students.length} {students.length === 1 ? 'studente' : 'studenti'}
                                        </span>
                                    </div>
                                    <div className="d-flex flex-wrap justify-content-center gap-2 max-h-200 overflow-y-auto p-1">
                                        {students.length === 0 ? (
                                            <p className={`small my-2 ${darkMode ? 'text-white-50' : 'text-muted'}`}>In attesa che si colleghino altri studenti...</p>
                                        ) : (
                                            students.map((s, idx) => (
                                                <span key={idx} className={`badge px-3 py-2 rounded-pill fs-6 fw-medium d-flex align-items-center gap-1.5 ${darkMode ? 'bg-secondary bg-opacity-40 text-white border border-secondary border-opacity-25' : 'bg-light text-dark border border-light-subtle shadow-sm'}`}>
                                                    <i className="bi bi-person-fill small text-orange"></i> {s}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={handleLeaveRoom}
                            className="btn btn-outline-danger rounded-pill px-4 py-2 fw-bold small opacity-75 hover-opacity-100 transition-all shadow-sm"
                        >
                            <i className="bi bi-box-arrow-left me-1.5"></i> Esci dalla Stanza
                        </button>
                    </div>
                )}
            </div>
        </div>
    );


}


