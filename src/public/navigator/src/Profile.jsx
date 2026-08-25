import React, { useState, useEffect } from 'react';

export default function ProfileModal({ isOpen, onClose, user, onUpdate }) {
    const [name, setName] = useState(user?.name || '');
    const [propic, setPropic] = useState(user?.propic || '');
    const [preferredLevel, setPreferredLevel] = useState(localStorage.getItem('artaround_preferred_level') || user?.preferredLevel || 'medio');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [fieldError, setFieldError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName(user?.name || localStorage.getItem('artaround_student_name') || '');
            setPropic(user?.propic || '');
            setPreferredLevel(localStorage.getItem('artaround_preferred_level') || user?.preferredLevel || 'medio');
            setMessage('');
            setError('');
            setFieldError('');
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const validateUsername = (val) => {
        if (!val) return "";
        if (val.length < 3) return "Il nome deve avere almeno 3 caratteri.";
        if (/\s/.test(val)) return "Gli spazi non sono consentiti. Usa '_' o '.'.";
        if (!/^[a-zA-Z0-9_.]+$/.test(val)) return "Caratteri non validi. Usa solo lettere, numeri, '_' e '.'.";
        return "";
    };

    const handleNameChange = (e) => {
        const val = e.target.value;
        setName(val);
        setFieldError(validateUsername(val));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        
        if (name) {
            const vErr = validateUsername(name);
            if (vErr) {
                setFieldError(vErr);
                return;
            }
        }

        localStorage.setItem('artaround_preferred_level', preferredLevel);
        if (name) {
            localStorage.setItem('artaround_student_name', name);
        }

        const token = localStorage.getItem('artaround_token');
        if (token) {
            try {
                const res = await fetch('/api/profile', {
                    method: 'PUT',
                    headers: { 'Authorization': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, propic, preferredLevel })
                });
                if (res.ok) {
                    const data = await res.json();
                    const updatedUser = { ...data.user, preferredLevel };
                    localStorage.setItem('artaround_user', JSON.stringify(updatedUser));
                    if (onUpdate) onUpdate(updatedUser);
                }
            } catch (err) {
                console.error(err);
            }
        } else {
            if (onUpdate) onUpdate({ name, propic, preferredLevel });
        }

        setMessage('Profilo e preferenze aggiornati!');
        setTimeout(() => onClose(), 800);
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
                <div className="modal-dialog modal-dialog-centered max-w-500">
                    <div className={`modal-content border-0 rounded-4 shadow-xl overflow-hidden ${isDarkMode ? 'bg-dark text-white border border-secondary border-opacity-25' : 'bg-white text-dark'}`}>
                        
                        <div className="modal-header border-0 p-4 pb-2 d-flex align-items-center justify-content-between">
                            <h4 className="fw-black mb-0 d-flex align-items-center gap-2">
                                <i className="bi bi-person-gear text-orange fs-4"></i> Modifica Profilo
                            </h4>
                            <button type="button" className={`btn-close ${isDarkMode ? 'btn-close-white' : ''}`} onClick={onClose}></button>
                        </div>

                        <div className="modal-body p-4 pt-2">
                            {message && <div className="alert alert-success border-0 rounded-3 shadow-sm py-2 px-3 mb-3 d-flex align-items-center gap-2"><i className="bi bi-check-circle-fill fs-5"></i><span>{message}</span></div>}
                            {error && <div className="alert alert-danger border-0 rounded-3 shadow-sm py-2 px-3 mb-3 d-flex align-items-center gap-2"><i className="bi bi-exclamation-triangle-fill fs-5"></i><span>{error}</span></div>}
                            
                            <div className="mb-4 text-center">
                                <div className="position-relative d-inline-block">
                                    <div className="rounded-circle overflow-hidden d-flex align-items-center justify-content-center text-white display-5 fw-black shadow-lg position-relative border border-4 border-white profile-avatar-xl">
                                        <span>{name ? name.charAt(0).toUpperCase() : (user?.name ? user.name.charAt(0).toUpperCase() : 'U')}</span>
                                        {propic && (
                                            <img src={propic} className="position-absolute top-0 start-0 w-100 h-100 object-fit-cover propic-fade-in" alt="Avatar" onLoad={(e) => e.target.classList.add('loaded')} onError={(e) => e.target.classList.remove('loaded')} />
                                        )}
                                    </div>
                                    <label className="position-absolute bottom-0 end-0 bg-orange text-white rounded-circle d-flex align-items-center justify-content-center shadow-md cursor-pointer border border-2 border-white hover-scale camera-badge-btn" title="Carica nuova foto">
                                        <i className="bi bi-camera-fill fs-6"></i>
                                        <input type="file" className="d-none" accept="image/*" onChange={handleFileUpload} />
                                    </label>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-bold small text-uppercase tracking-wider opacity-75">Username</label>
                                <div className="input-group has-validation">
                                    <span className={`input-group-text border-end-0 fw-bold rounded-start-3 ${isDarkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary border-opacity-50' : 'bg-light text-secondary'}`}>@</span>
                                    <input 
                                        type="text" 
                                        className={`form-control rounded-end-3 ${fieldError ? 'is-invalid border-danger' : ''} ${isDarkMode ? 'bg-dark text-white border-secondary border-opacity-50' : ''}`} 
                                        value={name} 
                                        onChange={handleNameChange} 
                                        placeholder="tuo_username"
                                    />
                                    {fieldError && (
                                        <div className="invalid-feedback d-flex align-items-center gap-1 mt-1 text-danger fw-medium">
                                            <i className="bi bi-exclamation-circle-fill fs-6"></i> {fieldError}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="mb-3">
                                <label className="form-label fw-bold small text-uppercase tracking-wider opacity-75">URL Immagine Profilo</label>
                                <div className="input-group">
                                    <input 
                                        type="text" 
                                        className={`form-control rounded-start-3 ${isDarkMode ? 'bg-dark text-white border-secondary border-opacity-50' : ''}`}
                                        placeholder="https://... o data:image/..." 
                                        value={propic} 
                                        onChange={(e) => setPropic(e.target.value)} 
                                    />
                                    <label className="btn btn-outline-secondary rounded-end-3 mb-0 d-flex align-items-center gap-1.5 fw-bold">
                                        <i className="bi bi-upload"></i> Carica
                                        <input type="file" className="d-none" accept="image/*" onChange={handleFileUpload} />
                                    </label>
                                </div>
                            </div>

                            <div className="mb-2">
                                <label className="form-label fw-bold small text-uppercase tracking-wider opacity-75 d-flex align-items-center gap-1.5">
                                    <i className="bi bi-sliders text-orange"></i> Livello di Testo Preferito
                                </label>
                                <select 
                                    className={`form-select rounded-3 py-2.5 fw-medium ${isDarkMode ? 'bg-dark text-white border-secondary border-opacity-50' : 'bg-white text-dark'}`}
                                    value={preferredLevel} 
                                    onChange={(e) => setPreferredLevel(e.target.value)}
                                >
                                    <option value="infantile">Infantile (Semplificato per bambini)</option>
                                    <option value="semplice">Semplice (Linguaggio intuitivo)</option>
                                    <option value="medio">Medio (Standard bilanciato)</option>
                                    <option value="dettagliato">Dettagliato (Approfondito completo)</option>

                                </select>
                                <div className="form-text small opacity-75 mt-1.5">
                                    Impostato come default automatico per tutte le visite guidate e la riproduzione audio.
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer border-0 p-4 pt-0 d-flex gap-2">
                            <button type="button" className="btn btn-secondary rounded-pill px-4 py-2 fw-bold" onClick={onClose}>Annulla</button>
                            <button type="button" className="btn btn-orange text-white rounded-pill px-4.5 py-2 fw-bold shadow-sm active-scale" onClick={handleSave}>Salva Modifiche</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

}

