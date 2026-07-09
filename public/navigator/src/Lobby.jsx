import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Lobby() {
    const navigate = useNavigate();
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const pin = query.get('pin');
    const visitId = query.get('visitId');
    
    const [students, setStudents] = useState([]);
    const [status, setStatus] = useState('In attesa del docente...');

    useEffect(() => {
        if (!pin || !visitId) {
            navigate('/room');
            return;
        }

        const eventSource = new EventSource(`/api/rooms/events/${pin}`);

        eventSource.addEventListener('connected', (e) => {
            const data = JSON.parse(e.data);
            setStudents(data.students || []);
        });

        eventSource.addEventListener('student-joined', (e) => {
            const data = JSON.parse(e.data);
            setStudents(data.students || []);
        });

        eventSource.addEventListener('visit-started', (e) => {
            setStatus('Visita avviata! Sto caricando...');
            eventSource.close();
            // Reindirizziamo al dettaglio della visita
            navigate(`/visit/${visitId}?pin=${pin}`);
        });

        return () => {
            eventSource.close();
        };
    }, [pin, navigate]);

    return (
        <div className="container mt-5 text-center">
            <h1 className="fw-black mb-4">Sei nella Lobby</h1>
            <p className="lead mb-4">Stanza: <span className="fw-bold text-orange">{pin}</span></p>
            
            <div className="spinner-grow text-orange mb-4" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            
            <h4 className="fw-bold text-secondary mb-5">{status}</h4>

            <div className="card shadow-sm border-0 rounded-4 mx-auto" style={{ maxWidth: '400px' }}>
                <div className="card-body">
                    <h5 className="fw-bold mb-3">Studenti Connessi ({students.length})</h5>
                    <div className="d-flex flex-wrap justify-content-center gap-2">
                        {students.map((s, idx) => (
                            <span key={idx} className="badge bg-secondary px-3 py-2 rounded-pill fs-6">{s}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
