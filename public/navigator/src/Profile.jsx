import React, { useState, useEffect } from 'react';

export default function ProfileModal({ isOpen, onClose, user, onUpdate }) {
    const [name, setName] = useState('');
    const [propic, setPropic] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && user) {
            setName(user.name || '');
            setPropic(user.propic || '');
            setMessage('');
            setError('');
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const token = localStorage.getItem('artaround_token');
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Authorization': token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, propic })
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('artaround_user', JSON.stringify(data.user));
                setMessage('Profilo aggiornato con successo!');
                if (onUpdate) onUpdate(data.user);
                setTimeout(() => onClose(), 1000);
            } else {
                const data = await res.json();
                setError(data.error || 'Errore durante l\'aggiornamento');
            }
        } catch (err) {
            setError('Errore di connessione');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const token = localStorage.getItem('artaround_token');
            const res = await fetch('/api/upload/user', {
                method: 'POST',
                headers: { 'Authorization': token },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setPropic(data.url);
                setMessage('Immagine caricata, ricordati di salvare!');
                setError('');
            } else {
                const err = await res.json();
                setError(err.error || 'Errore durante il caricamento');
                setMessage('');
            }
        } catch (err) {
            setError('Errore durante il caricamento dell\'immagine');
            setMessage('');
        }
    };

    const isDarkMode = document.body.classList.contains('dark-mode');

    return (
        <>
            <div className="modal-backdrop fade show profile-modal-backdrop"></div>
            <div className="modal fade show d-block" tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className={`modal-content ${isDarkMode ? 'bg-dark text-white' : 'bg-white'}`}>
                        <div className="modal-header border-0">
                            <h5 className="modal-title fw-bold">Modifica Profilo</h5>
                            <button type="button" className={`btn-close ${isDarkMode ? 'btn-close-white' : ''}`} onClick={onClose}></button>
                        </div>
                        <div className="modal-body">
                            {message && <div className="alert alert-success py-2">{message}</div>}
                            {error && <div className="alert alert-danger py-2">{error}</div>}
                            
                            <div className="mb-3 text-center">
                                <div className="mx-auto rounded-circle bg-secondary overflow-hidden mb-3 d-flex align-items-center justify-content-center profile-modal-avatar position-relative text-white display-5 fw-bold">
                                    <span>{name ? name.charAt(0).toUpperCase() : (user?.name ? user.name.charAt(0).toUpperCase() : 'U')}</span>
                                    {propic && (
                                        <img src={propic} className="position-absolute top-0 start-0 w-100 h-100 object-fit-cover" alt="" style={{ opacity: 0, transition: 'opacity 0.3s' }} onLoad={(e) => e.target.style.opacity = 1} onError={(e) => e.target.style.opacity = 0} />
                                    )}
                                </div>
                            </div>
                            
                            <div className="mb-3">
                                <label className="form-label">Nome Visualizzato</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                />
                            </div>
                            
                            <div className="mb-3">
                                <label className="form-label">URL Immagine Profilo</label>
                                <div className="input-group">
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="https://... o data:image/..." 
                                        value={propic} 
                                        onChange={(e) => setPropic(e.target.value)} 
                                    />
                                    <label className="btn btn-outline-secondary mb-0">
                                        <i className="bi bi-upload"></i> Carica
                                        <input type="file" className="d-none" accept="image/*" onChange={handleFileUpload} />
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer border-0">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Annulla</button>
                            <button type="button" className="btn bg-orange text-white" onClick={handleSave}>Salva</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
