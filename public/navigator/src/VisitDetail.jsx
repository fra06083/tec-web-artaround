import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { fetchVisita, fetchItemsByVisita, fetchDescriptionsByItem, getDarkMode, setDarkMode, getUser, logout } from './api';
import ProfileModal from './Profile';

const LEVELS = ['infantile', 'semplice', 'medio', 'dettagliato'];

function VisitDetail() {
    const { id } = useParams();
    const [visita, setVisita] = useState(null);
    const [items, setItems] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [darkMode, setDarkModeState] = useState(getDarkMode());
    const [user, setUser] = useState(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [descriptions, setDescriptions] = useState([]);
    const [selectedType, setSelectedType] = useState('medio');
    const [isSpeaking, setIsSpeaking] = useState(false);

    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const pin = query.get('pin');
    const role = query.get('role'); // 'teacher' o null/studente
    
    // Ferma la sintesi vocale
    const stopSpeaking = useCallback(() => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);

    // Leggi il testo ad alta voce
    const speak = useCallback((text) => {
        stopSpeaking();
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'it-IT';
        utterance.rate = 1;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    }, [stopSpeaking]);

    // Dimmi di più / dimmi di meno
    const changeLevelUp = () => {
        const i = LEVELS.indexOf(selectedType);
        if (i < LEVELS.length - 1) setSelectedType(LEVELS[i + 1]);
    };
    const changeLevelDown = () => {
        const i = LEVELS.indexOf(selectedType);
        if (i > 0) setSelectedType(LEVELS[i - 1]);
    };

    useEffect(() => {
        // Applica la classe dark-mode al body
        if (darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        // Sincronizza dark mode con localStorage
        const handleStorageChange = () => {
            const newDarkMode = getDarkMode();
            setDarkModeState(newDarkMode);
            if (newDarkMode) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        };

        window.addEventListener('storage', handleStorageChange);

        // Carica utente
        const userData = getUser();
        setUser(userData);

        Promise.all([fetchVisita(id), fetchItemsByVisita(id)])
            .then(([visitaData, itemsData]) => {
                setVisita(visitaData);
                setItems(itemsData);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            document.body.classList.remove('dark-mode');
        };
    }, [id, darkMode]);

    useEffect(() => {
        if (items.length > 0) {
            const currentItemId = items[currentIndex]?._id;
            if (currentItemId) {
                fetchDescriptionsByItem(currentItemId)
                    .then(data => setDescriptions(data))
                    .catch(err => console.error(err));
            }
        }
    }, [currentIndex, items]);

    // SSE Effect per gli studenti
    useEffect(() => {
        if (pin && role !== 'teacher') {
            const eventSource = new EventSource(`/api/rooms/events/${pin}`);
            
            eventSource.addEventListener('artwork-changed', (e) => {
                const data = JSON.parse(e.data);
                if (data.artworkIndex !== undefined) {
                    setCurrentIndex(data.artworkIndex);
                    // Ferma l'audio precedente se stava parlando
                    stopSpeaking();
                }
            });

            return () => {
                eventSource.close();
            };
        }
    }, [pin, role, stopSpeaking]);

    const handleIndexChange = async (newIndex) => {
        if (newIndex < 0 || newIndex >= items.length) return;
        
        setCurrentIndex(newIndex);
        
        if (pin && role === 'teacher') {
            try {
                await fetch('/api/rooms/change-artwork', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin, artworkIndex: newIndex })
                });
            } catch (err) {
                console.error("Errore nel cambio opera remoto:", err);
            }
        }
    };

    const currentDescription = descriptions.find(d => d.type === selectedType);

    const toggleDarkMode = () => {
        const newValue = !darkMode;
        setDarkModeState(newValue);
        setDarkMode(newValue);
    };

    const handleLogout = () => {
        logout();
        setUser(null);
        setUserMenuOpen(false);
        window.location.href = '/index.html';
    };

    const bgMain = darkMode ? 'bg-dark text-white' : 'bg-white text-dark';
    const bgNavbar = darkMode ? 'glass-header border-bottom border-secondary border-opacity-10' : 'glass-header-light shadow-sm';
    const brandColor = darkMode ? 'text-white' : 'text-primary';
    const bgCard = darkMode ? 'bg-dark border border-secondary border-opacity-25' : 'bg-white border';
    const textMuted = darkMode ? 'text-white-50' : 'text-secondary';
    const bgFooter = darkMode ? 'bg-dark border-top border-secondary border-opacity-25' : 'bg-light border-top';
    const footerText = darkMode ? 'text-white-50' : 'text-secondary';

    if (loading) return (
        <div className={`vh-100 d-flex flex-column align-items-center justify-content-center ${bgMain}`}>
            <div className="spinner-border text-red spinner-lg mb-4" role="status">
                <span className="visually-hidden">Caricamento...</span>
            </div>
            <h5 className={`fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>Caricamento visita...</h5>
        </div>
    );

    if (error) return (
        <div className={`vh-100 d-flex flex-column align-items-center justify-content-center text-center px-4 ${bgMain}`}>
            <i className="bi bi-exclamation-triangle text-red icon-5xl mb-3"></i>
            <h3 className={`fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>Errore</h3>
            <p className={textMuted}>{error}</p>
            <Link to="/" className="btn btn-outline-red rounded-pill px-4">← Torna alla lista</Link>
        </div>
    );

    if (!visita) return (
        <div className="vh-100 d-flex flex-column align-items-center justify-content-center text-center">
            <i className="bi bi-question-circle text-white-50 icon-5xl mb-3"></i>
            <h3 className="fw-bold">Visita non trovata</h3>
            <Link to="/" className="btn btn-outline-red rounded-pill px-4 mt-3">← Torna alla lista</Link>
        </div>
    );

    if (items.length === 0) return (
        <div className={`min-vh-100 d-flex flex-column ${bgMain}`}>
            {/* NAVBAR */}
            <header className={`navbar sticky-top py-3 desktop-navbar transition-theme border-0 ${bgNavbar}`}>
                <div className="container-lg d-flex justify-content-between align-items-center">
                    <a href="/" className={`navbar-brand fw-black fs-4 m-0 d-flex align-items-center gap-2 ${brandColor}`}>
                        <div className="bg-orange-subtle text-orange p-2 rounded-3 d-flex align-items-center justify-content-center">
                            <i className="bi bi-box-seam fs-5"></i>
                        </div>
                        <span style={{ letterSpacing: '-0.5px' }}>ArtAround</span>
                    </a>
            </div>
        </header>
        <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center px-4">
            <i className={`bi bi-inbox ${textMuted} icon-5xl mb-3`}></i>
            <h3 className="fw-bold">{visita.name}</h3>
            <p className={textMuted}>Nessuna opera in questa visita.</p>
            <Link to="/" className="btn btn-outline-red rounded-pill px-4 mt-2">← Torna alla lista</Link>
        </div>
    </div>
);

    const currentItem = items[currentIndex];

    return (
        <div className={`min-vh-100 d-flex flex-column ${bgMain}`}>
            {/* HEADER CON TITOLO OPERA AL POSTO DELLA NAVBAR */}
            <header className={`sticky-top py-3 border-0 shadow-sm ${bgNavbar}`}>
                <div className="container-lg d-flex align-items-center justify-content-between px-3">
                    <Link to="/" className={`btn btn-sm rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`} style={{ width: '45px', height: '45px' }}>
                        <i className="bi bi-arrow-left fs-5"></i>
                    </Link>
                    <h3 className={`m-0 fw-black text-center text-truncate px-3 ${darkMode ? 'text-white' : 'text-dark'}`} style={{ letterSpacing: '-0.5px' }}>
                        {currentItem.item}
                    </h3>
                    <div style={{ width: '45px', height: '45px' }} className="flex-shrink-0"></div>
                </div>
            </header>

            {/* CONTENUTO */}
            <main className="flex-grow-1">
                <div className="container-lg py-4">
                    {/* INFO VISITA */}
                    <div className="mb-4">
                        <h4 className="fw-bold mb-1">{visita.name}</h4>
                        {visita.museum_id && (
                            <div className={`d-flex align-items-center gap-1 ${textMuted} small`}>
                                <i className="bi bi-geo-alt-fill text-red"></i>
                                <span>{visita.museum_id.museum} — {visita.museum_id.province}</span>
                            </div>
                        )}
                    </div>

                    {/* CARD OPERA */}
                    <div className={`card border-0 rounded-4 shadow-sm overflow-hidden ${bgCard}`}>
                        {/* 1. INFO SOPRA L'IMMAGINE */}
                        <div className="card-header border-0 bg-transparent p-4 pb-3">
                            <div className="d-flex flex-wrap gap-3">
                                <div className="d-flex align-items-center gap-2">
                                    <i className="bi bi-person-fill text-orange"></i>
                                    <span className={`fw-medium ${textMuted}`}>{currentItem.author}</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <i className="bi bi-file-earmark-text-fill text-orange"></i>
                                    <span className={`fw-medium ${textMuted}`}>{currentItem.license}</span>
                                </div>
                            </div>
                        </div>

                        {/* 2. IMMAGINE PRINCIPALE */}
                        {currentItem.img_path && (
                            <div className="px-4 pb-3">
                                <img
                                    src={currentItem.img_path}
                                    alt={currentItem.item}
                                    className="img-fluid rounded-4 w-100 object-fit-cover shadow-sm"
                                    style={{ maxHeight: '650px' }}
                                />
                            </div>
                        )}

                        {/* 3. TESTO DESCRIZIONE */}
                        <div className="card-body p-4 pt-0">
                            <div className={`rounded-4 p-4 mb-4 shadow-sm ${darkMode ? 'bg-secondary bg-opacity-10' : 'bg-light'}`}>
                                {currentDescription ? (
                                    <p className={`mb-0 fs-5 lh-lg fw-medium ${darkMode ? 'text-light' : 'text-dark'}`}>
                                        {currentDescription.text}
                                    </p>
                                ) : (
                                    <p className={`${textMuted} mb-0 text-center`}>
                                        <i className="bi bi-exclamation-circle me-2 text-orange"></i>
                                        Manca la descrizione per il livello <strong>{selectedType}</strong>.
                                    </p>
                                )}
                            </div>

                            {/* 4. CASELLA DETTAGLI CON BOTTONI */}
                            <div className={`d-flex flex-column flex-md-row align-items-md-center justify-content-between p-3 rounded-4 shadow-sm ${darkMode ? 'bg-dark border border-secondary border-opacity-25' : 'bg-white border'}`}>
                                <div className={`fw-bold fs-5 mb-3 mb-md-0 d-flex align-items-center gap-2 ${darkMode ? 'text-white' : 'text-dark'}`}>
                                    <div className="bg-orange text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                                        <i className="bi bi-info-lg"></i>
                                    </div>
                                    Dettagli
                                </div>
                                
                                <div className="d-flex flex-wrap align-items-center gap-2">
                                    {/* Più (+) */}
                                    <button
                                        onClick={changeLevelUp}
                                        disabled={LEVELS.indexOf(selectedType) === LEVELS.length - 1}
                                        className="btn btn-success rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                                        style={{ width: '45px', height: '45px' }}
                                        title="Più dettagli"
                                    >
                                        <i className="bi bi-plus-lg fs-5"></i>
                                    </button>

                                    {/* Meno (-) */}
                                    <button
                                        onClick={changeLevelDown}
                                        disabled={LEVELS.indexOf(selectedType) === 0}
                                        className="btn btn-danger rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                                        style={{ width: '45px', height: '45px' }}
                                        title="Meno dettagli"
                                    >
                                        <i className="bi bi-dash-lg fs-5"></i>
                                    </button>

                                    <div className="vr mx-1 d-none d-md-block opacity-25"></div>

                                    {/* TTS */}
                                    <button
                                        onClick={() => isSpeaking ? stopSpeaking() : speak(currentDescription?.text)}
                                        disabled={!currentDescription}
                                        className={`btn rounded-circle d-flex align-items-center justify-content-center shadow-sm ${isSpeaking ? 'btn-warning' : 'btn-info text-white'}`}
                                        style={{ width: '45px', height: '45px' }}
                                        title="Ascolta descrizione"
                                    >
                                        <i className={`bi ${isSpeaking ? 'bi-stop-fill' : 'bi-headphones'} fs-5`}></i>
                                    </button>

                                    {/* Mic */}
                                    <button 
                                        className="btn btn-secondary rounded-circle d-flex align-items-center justify-content-center shadow-sm" 
                                        style={{ width: '45px', height: '45px' }}
                                        onClick={() => alert("Funzionalità microfono in arrivo per i comandi vocali!")}
                                        title="Usa comandi vocali"
                                    >
                                        <i className="bi bi-mic-fill fs-5"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* NAVIGAZIONE */}
                    {(!pin || role === 'teacher') && (
                        <div className="d-flex gap-3 justify-content-center mt-4">
                            <button
                                onClick={() => handleIndexChange(currentIndex - 1)}
                                disabled={currentIndex === 0}
                                className="btn btn-outline-red rounded-pill px-4 btn-with-icon"
                            >
                                <i className="bi bi-arrow-left"></i> Precedente
                            </button>
                            <button
                                onClick={() => handleIndexChange(currentIndex + 1)}
                                disabled={currentIndex === items.length - 1}
                                className="btn bg-red text-white rounded-pill px-4 btn-with-icon"
                            >
                                Prossimo <i className="bi bi-arrow-right"></i>
                            </button>
                        </div>
                    )}

                    {/* PROGRESS DOTS */}
                    {(!pin || role === 'teacher') && (
                        <div className="d-flex justify-content-center gap-2 mt-4">
                            {items.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleIndexChange(i)}
                                    className={`btn p-0 border-0 rounded-circle ${i === currentIndex ? 'bg-red' : 'bg-secondary'}`}
                                    style={{ width: '10px', height: '10px' }}
                                ></button>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* FOOTER */}
            <footer className={`${bgFooter} py-4 mt-auto`}>
                <div className="container-lg">
                    <div className="row align-items-center">
                        <div className={`col-6 ${footerText} small`}>
                            &copy; 2026 ArtAround. All rights reserved.
                        </div>
                        <div className="col-6 text-end fw-bold">
                            <i className="bi bi-box-seam text-red me-2"></i> ArtAround
                        </div>
                    </div>
                </div>
            </footer>
            <ProfileModal 
                isOpen={isProfileModalOpen} 
                onClose={() => setIsProfileModalOpen(false)} 
                user={user} 
                onUpdate={(updatedUser) => setUser(updatedUser)} 
            />
        </div>
    );
}

export default VisitDetail;
