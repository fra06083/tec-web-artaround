import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUser } from './api';

export default function RoomJoin() {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [studentName, setStudentName] = useState('Studente Anonimo');
    const navigate = useNavigate();

    useEffect(() => {
        const initUser = async () => {
            if (window.hideMainLoader) window.hideMainLoader();
            const user = await fetchUser();
            if (user) setStudentName(user.name);
        };
        initUser();
    }, []);

    const handleJoin = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            const res = await fetch('/api/rooms/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin, studentName })
            });

            const data = await res.json();
            if (res.ok) {
                if (data.requiresApproval) {
                    navigate(`/lobby?pin=${pin}&visitId=${data.visitId}&reqId=${data.reqId}&pending=true`);
                } else {
                    navigate(`/lobby?pin=${pin}&visitId=${data.visitId}`);
                }
            } else {
                setError(data.error || 'Errore durante l\'ingresso nella stanza');
            }
        } catch (err) {
            setError('Errore di connessione');
        }
    };

    return (
        <div className="container mt-5 text-center">
            <h1 className="fw-black mb-4">Unisciti a una Visita Guidata</h1>
            <p className="lead mb-5">Inserisci il PIN fornito dal tuo docente.</p>
            
            <form onSubmit={handleJoin} className="d-inline-block w-100 mx-auto max-w-400">
                <div className="mb-4">
                    <input 
                        type="text" 
                        className="form-control form-control-lg text-center fw-bold fs-3" 
                        placeholder="Es: 12345" 
                        value={pin}
                        onChange={e => setPin(e.target.value)}
                        required 
                    />
                </div>
                {error && <div className="alert alert-danger">{error}</div>}
                
                <button type="submit" className="btn btn-lg bg-orange text-white rounded-pill w-100 fw-bold shadow">
                    Entra nella Stanza
                </button>
            </form>
            
            <div className="mt-4">
                <button onClick={() => navigate('/')} className="btn btn-link text-secondary">
                    Torna alle visite singole
                </button>
            </div>
        </div>
    );
}
