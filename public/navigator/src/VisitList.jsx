import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchVisite, getDarkMode, setDarkMode, getUser, logout } from './api';

function VisitList() {
    const [visite, setVisite] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [darkMode, setDarkModeState] = useState(getDarkMode());
    const [user, setUser] = useState(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

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

        fetchVisite()
            .then(data => setVisite(data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            document.body.classList.remove('dark-mode');
        };
    }, [darkMode]);

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
            <h5 className="fw-bold">Caricamento visite...</h5>
        </div>
    );

    if (error) return (
        <div className={`vh-100 d-flex flex-column align-items-center justify-content-center text-center px-4 ${bgMain}`}>
            <i className="bi bi-exclamation-triangle text-red icon-5xl mb-3"></i>
            <h3 className="fw-bold">Errore</h3>
            <p className={textMuted}>{error}</p>
            <button onClick={() => window.location.reload()} className="btn btn-outline-red rounded-pill px-4 mt-2">
                Riprova
            </button>
        </div>
    );

    return (
        <div className={`min-vh-100 d-flex flex-column ${bgMain}`}>
            {/* NAVBAR */}
            <header className={`navbar navbar-expand-lg sticky-top py-3 ${bgNavbar}`}>
                <div className="container-lg d-flex justify-content-between align-items-center">
                    <a href="/" className={`navbar-brand fw-bold fs-4 d-flex align-items-center gap-2 ${brandColor}`}>
                        <i className="bi bi-box-seam text-red"></i> ArtAround
                    </a>
                    <div className="d-flex align-items-center gap-3">
                        <a href="/editor-marketplace/" className="btn btn-outline-orange rounded-pill px-4 fw-medium btn-with-icon d-none d-md-inline-flex">
                            <i className="bi bi-shop"></i> Marketplace
                        </a>

                        {/* Dark Mode Toggle Slider */}
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
                            <a href="/login.html?redirect=/navigator/" className="btn bg-slate text-white rounded-pill px-4 fw-bold shadow-sm btn-reveal-icon">
                                <span>Sign in</span>
                                <i className="bi bi-arrow-right-short reveal-icon"></i>
                            </a>
                        ) : (
                            <div className="position-relative">
                                {/* Trigger: Avatar */}
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="btn p-0 border-0 d-flex align-items-center gap-2 shadow-none"
                                >
                                    <div className="user-avatar rounded-circle bg-orange d-flex align-items-center justify-content-center text-white fw-bold shadow-sm">
                                        <span>{user.name?.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <i className="bi bi-chevron-down x-small chevron-icon"></i>
                                </button>

                                {/* Dropdown Menu Professionale */}
                                {userMenuOpen && (
                                    <div className="auth-dropdown-menu shadow-lg rounded-4 border-0 py-2 mt-2">
                                        <div className="dropdown-header-info px-4 py-2 border-bottom">
                                            <div className="fw-bold user-name-text text-dark">{user.name}</div>
                                            <div className="x-small text-uppercase text-orange fw-bold">{user.permissions}</div>
                                        </div>

                                        <a href="/editor-marketplace/" className="dropdown-link-item">
                                            <i className="bi bi-grid-1x2 text-orange"></i>
                                            <span className="text-dark">Dashboard</span>
                                        </a>

                                        {user.permissions === 'admin' && (
                                            <a href="/editor/dashboard" className="dropdown-link-item">
                                                <i className="bi bi-pencil-square text-orange"></i>
                                                <span className="text-dark">Admin Panel</span>
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

            {/* HERO */}
            <div className="container-lg py-4">
                <div className="rounded-5 p-4 p-md-5 mb-4 bg-gradient-red overflow-hidden">
                    <div className="row align-items-center">
                        <div className="col-12 col-md-8 text-center text-md-start">
                            <h1 className="fw-bold text-white display-5 mb-2">Esplora le Visite</h1>
                            <p className="text-white-75 lead mb-0">
                                Scegli una visita guidata e inizia il tuo percorso nel museo.
                            </p>
                        </div>
                        <div className="col-md-4 d-none d-md-block text-end">
                            <i className="bi bi-compass text-white opacity-25 icon-5xl"></i>
                        </div>
                    </div>
                </div>

                {visite.length === 0 ? (
                    <div className="text-center py-5">
                        <i className={`bi bi-inbox ${textMuted} icon-5xl mb-3 d-block`}></i>
                        <h4 className="fw-bold">Nessuna visita disponibile</h4>
                        <p className={textMuted}>Torna più tardi per nuovi contenuti.</p>
                    </div>
                ) : (
                    <div className="row g-4">
                        {visite.map(v => (
                            <div key={v._id} className="col-12 col-md-6 col-lg-4">
                                <div className={`card h-100 rounded-4 overflow-hidden shadow hover-lift ${bgCard}`}>
                                    <div className="card-body p-4 d-flex flex-column">
                                        <h5 className="fw-bold mb-1">{v.name}</h5>

                                        {v.museum_id && (
                                            <div className={`d-flex align-items-center gap-1 ${textMuted} small mb-3`}>
                                                <i className="bi bi-geo-alt-fill text-red"></i>
                                                <span>{v.museum_id.museum} — {v.museum_id.province}</span>
                                            </div>
                                        )}

                                        {v.description && (
                                            <p className={`${textMuted} small flex-grow-1`}>{v.description}</p>
                                        )}

                                        <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary border-opacity-25">
                                            <span className={`${textMuted} small`}>
                                                <i className="bi bi-collection me-1"></i>
                                                {v.items?.length || 0} opere
                                            </span>
                                            <Link to={`/visit/${v._id}`} className="btn btn-outline-red rounded-pill px-3 fw-bold btn-sm">
                                                Inizia visita
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

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

export default VisitList;