import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchVisita, fetchItemsByVisita, fetchDescriptionsByItem, getDarkMode, setDarkMode, getUser, logout } from './api';

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
    const [descriptions, setDescriptions] = useState([]);
    const [selectedType, setSelectedType] = useState('medio');
    const [isSpeaking, setIsSpeaking] = useState(false);
    
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
            const currentItemId = items[currentIndex]._id;
            fetchDescriptionsByItem(currentItemId)
                .then(data => setDescriptions(data))
                .catch(err => console.error(err));
        }
    }, [currentIndex, items]);

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
    const bgNavbar = darkMode ? 'bg-dark border-bottom border-secondary border-opacity-25' : 'bg-white shadow-sm';
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
        <header className={`navbar sticky-top py-3 shadow-sm ${bgNavbar}`}>
            <div className="container-lg d-flex justify-content-between align-items-center">
                <a href="/" className={`navbar-brand fw-bold fs-4 d-flex align-items-center gap-2 ${brandColor}`}>
                    <i className="bi bi-box-seam text-red"></i> ArtAround
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
            {/* NAVBAR */}
            <header className={`navbar sticky-top py-3 shadow-sm ${bgNavbar}`}>
                <div className="container-lg d-flex justify-content-between align-items-center">
                    <Link to="/" className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-flex align-items-center gap-1">
                        <i className="bi bi-arrow-left"></i> Visite
                    </Link>
                    <a href="/" className={`fw-bold text-decoration-none d-flex align-items-center gap-2 ${brandColor}`}>
                        <i className="bi bi-box-seam text-red"></i>
                        <span className="d-none d-md-inline">ArtAround</span>
                    </a>
                    <div className="d-flex align-items-center gap-3">
                        {/* Dark Mode Toggle */}
                        <button
                            className={`dark-mode-toggle ${darkMode ? 'active' : ''}`}
                            onClick={toggleDarkMode}
                        >
                            <div className="toggle-track">
                                <i className={`bi ${darkMode ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`}></i>
                            </div>
                        </button>

                        {/* Auth Section */}
                        {!user ? (
                            <a href="/login.html?redirect=/navigator/" className="btn bg-slate text-white rounded-pill px-3 btn-sm fw-bold shadow-sm">
                                Sign in
                            </a>
                        ) : (
                            <div className="position-relative">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="btn p-0 border-0 d-flex align-items-center gap-2 shadow-none"
                                >
                                    <div className="user-avatar rounded-circle bg-orange d-flex align-items-center justify-content-center text-white fw-bold shadow-sm">
                                        <span>{user.name?.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <i className="bi bi-chevron-down x-small chevron-icon"></i>
                                </button>

                                {userMenuOpen && (
                                    <div className="auth-dropdown-menu shadow-lg rounded-4 border-0 py-2 mt-2">
                                        <div className="dropdown-header-info px-4 py-2 border-bottom">
                                            <div className="fw-bold user-name-text">{user.name}</div>
                                            <div className="x-small text-uppercase text-orange fw-bold">{user.permissions}</div>
                                        </div>

                                        <a href="/editor-marketplace/" className="dropdown-link-item">
                                            <i className="bi bi-grid-1x2 text-orange"></i>
                                            <span>Dashboard</span>
                                        </a>

                                        {user.permissions === 'admin' && (
                                            <a href="/editor/dashboard" className="dropdown-link-item">
                                                <i className="bi bi-pencil-square text-orange"></i>
                                                <span>Admin Panel</span>
                                            </a>
                                        )}

                                        <div className="dropdown-divider-custom"></div>

                                        <button
                                            onClick={handleLogout}
                                            className="btn w-100 text-start dropdown-link-item logout-item border-0 bg-transparent"
                                        >
                                            <i className="bi bi-box-arrow-right"></i>
                                            <span className="fw-bold">Log out</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
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
                        {currentItem.img_path && (
                            <img
                                src={currentItem.img_path}
                                alt={currentItem.item}
                                className="card-img-top"
                            />
                        )}
                        <div className="card-body p-4">
                            <h2 className={`fw-bold mb-3 ${darkMode ? 'text-white' : 'text-dark'}`}>{currentItem.item}</h2>

                            <div className="d-flex flex-wrap gap-3 mb-3">
                                <div className="d-flex align-items-center gap-2">
                                    <i className="bi bi-person text-red"></i>
                                    <span className={`small ${textMuted}`}>{currentItem.author}</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <i className="bi bi-file-earmark-text text-red"></i>
                                    <span className={`small ${textMuted}`}>{currentItem.license}</span>
                                </div>
                            </div>

                            {/* SELETTORE LIVELLO */}
                            <div className="mt-2 mb-3 d-flex flex-wrap gap-2 justify-content-center">
                                {LEVELS.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedType(type)}
                                        className={`btn btn-sm rounded-pill px-3 ${
                                            selectedType === type
                                            ? 'btn-outline-secondary bg-secondary bg-opacity-25'
                                            : 'btn-outline-secondary border-opacity-25'
                                        }`}
                                    >
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                ))}
                            </div>

                            {/* AREA TESTO DESCRIZIONE */}
                            <div className={`rounded-4 p-4 mt-3 ${darkMode ? 'bg-secondary bg-opacity-10' : 'bg-light'}`}>
                                {currentDescription ? (
                                    <div>
                                        <p className={`mb-0 small ${textMuted}`}>
                                            <i className="bi bi-chat-left-text me-2 text-red"></i>
                                            {currentDescription.text}
                                        </p>
                                    </div>
                                ) : (
                                    <p className={`${textMuted} mb-0 text-center small`}>
                                        <i className="bi bi-exclamation-circle me-2 text-red"></i>
                                        Manca la descrizione per il tipo <strong>{selectedType}</strong>.
                                    </p>
                                )}
                            </div>

                            {/* CONTROLLI VOCALI */}
                            <div className="d-flex flex-wrap gap-2 justify-content-center mt-3">
                                {/* Play / Stop */}
                                <button
                                    onClick={() => isSpeaking ? stopSpeaking() : speak(currentDescription?.text)}
                                    disabled={!currentDescription}
                                    className={`btn rounded-pill px-4 btn-with-icon ${isSpeaking ? 'btn-outline-red' : 'bg-red text-white'}`}
                                >
                                    <i className={`bi ${isSpeaking ? 'bi-stop-fill' : 'bi-volume-up-fill'}`}></i>
                                    {isSpeaking ? 'Stop' : 'Ascolta'}
                                </button>

                                {/* Dimmi di meno */}
                                <button
                                    onClick={changeLevelDown}
                                    disabled={LEVELS.indexOf(selectedType) === 0}
                                    className="btn btn-outline-secondary rounded-pill px-3 btn-sm btn-with-icon"
                                >
                                    <i className="bi bi-dash-circle"></i> Dimmi di meno
                                </button>
                                
                                {/* Dimmi di più */}
                                <button
                                    onClick={changeLevelUp}
                                    disabled={LEVELS.indexOf(selectedType) === LEVELS.length - 1}
                                    className="btn btn-outline-secondary rounded-pill px-3 btn-sm btn-with-icon"
                                >
                                    <i className="bi bi-plus-circle"></i> Dimmi di più
                                </button>
                            </div>

                        </div>
                    </div>

                    {/* NAVIGAZIONE */}
                    <div className="d-flex gap-3 justify-content-center mt-4">
                        <button
                            onClick={() => setCurrentIndex(i => i - 1)}
                            disabled={currentIndex === 0}
                            className="btn btn-outline-red rounded-pill px-4 btn-with-icon"
                        >
                            <i className="bi bi-arrow-left"></i> Precedente
                        </button>
                        <button
                            onClick={() => setCurrentIndex(i => i + 1)}
                            disabled={currentIndex === items.length - 1}
                            className="btn bg-red text-white rounded-pill px-4 btn-with-icon"
                        >
                            Prossimo <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>

                    {/* PROGRESS DOTS */}
                    <div className="d-flex justify-content-center gap-2 mt-4">
                        {items.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentIndex(i)}
                                className={`btn p-0 border-0 rounded-circle ${i === currentIndex ? 'bg-red' : 'bg-secondary'}`}
                                style={{ width: '10px', height: '10px' }}
                            ></button>
                        ))}
                    </div>
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
        </div>
    );
}

export default VisitDetail;
