import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Lobby() {
    const navigate = useNavigate();
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const pin = query.get('pin');
    const visitId = query.get('visitId');
    const pending = query.get('pending');
    const reqId = query.get('reqId');
    
    const [students, setStudents] = useState([]);
    const [status, setStatus] = useState(pending ? 'In attesa di approvazione dal docente...' : 'In attesa del docente...');
    const [rejected, setRejected] = useState(false);

    useEffect(() => {
        if (!pin || !visitId) {
            navigate('/');
            return;
        }

        let eventSource = null;

        fetch(`/api/rooms/check/${pin}`)
            .then(res => res.json())
            .then(data => {
                if (!data.exists) {
                    setStatus('La stanza non è più disponibile o il codice è errato.');
                    setRejected(true);
                    return;
                }

                eventSource = new EventSource(`/api/rooms/events/${pin}`);

                eventSource.addEventListener('connected', (e) => {
                    const parsed = JSON.parse(e.data);
                    setStudents(parsed.students || []);
                });

                eventSource.addEventListener('student-joined', (e) => {
                    const parsed = JSON.parse(e.data);
                    setStudents(parsed.students || []);
                });

                eventSource.addEventListener('visit-started', (e) => {
                    if (!pending) {
                        setStatus('Visita avviata! Sto caricando...');
                        eventSource.close();
                        navigate(`/visit/${visitId}?pin=${pin}`);
                    }
                });

                eventSource.addEventListener('join-accepted', (e) => {
                    const parsed = JSON.parse(e.data);
                    if (pending && parsed.reqId === reqId) {
                        setStatus('Richiesta approvata! Sto caricando...');
                        eventSource.close();
                        navigate(`/visit/${visitId}?pin=${pin}&index=${parsed.currentArtworkIndex !== undefined ? parsed.currentArtworkIndex : 0}`);
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

                eventSource.onerror = () => {
                    setStatus('Connessione persa. La stanza potrebbe essere stata chiusa.');
                    setRejected(true);
                    eventSource.close();
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
        <div className="container mt-5 text-center">
            <h1 className="fw-black mb-4">Sei nella Lobby</h1>
            <p className="lead mb-4">Stanza: <span className="fw-bold text-orange">{pin}</span></p>
            
            {!rejected && (
                <div className="spinner-grow text-orange mb-4" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            )}
            
            <h4 className="fw-bold text-secondary mb-5">{status}</h4>

            {rejected && (
                <button onClick={() => navigate('/room')} className="btn bg-orange text-white rounded-pill px-4 fw-bold">
                    Torna alla schermata precedente
                </button>
            )}

            {!pending && (
                <div className="card shadow-sm border-0 rounded-4 mx-auto max-w-400">
                    <div className="card-body">
                        <h5 className="fw-bold mb-3">Studenti Connessi ({students.length})</h5>
                        <div className="d-flex flex-wrap justify-content-center gap-2">
                            {students.map((s, idx) => (
                                <span key={idx} className="badge bg-secondary px-3 py-2 rounded-pill fs-6">{s}</span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
