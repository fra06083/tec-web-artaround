import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchVisite, getDarkMode, setDarkMode, getUser, logout } from './api';
import ProfileModal from './Profile';

function VisitList() {
    const [visite, setVisite] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [darkMode, setDarkModeState] = useState(getDarkMode());
    const [user, setUser] = useState(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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
            <header className={`navbar fixed-top w-100 py-3 desktop-navbar transition-theme border-0 shadow-sm ${bgNavbar}`} style={{ zIndex: 1030 }}>
                <div className="container-lg d-flex align-items-center justify-content-between">
                    
                    {/* 1. LOGO */}
                    <a className={`navbar-brand fw-black fs-4 m-0 d-flex align-items-center gap-2 ${brandColor} me-auto`} href="/">
                        <div className="bg-orange-subtle text-orange p-2 rounded-3 d-flex align-items-center justify-content-center">
                            <i className="bi bi-box-seam fs-5"></i>
                        </div>
                        <span style={{ letterSpacing: '-0.5px' }}>ArtAround</span>
                    </a>

                    {/* 2. MOBILE CONTROLS */}
                    <div className="d-flex d-lg-none align-items-center gap-2">
                        <button 
                            className={`btn btn-link p-1 shadow-none ${darkMode ? 'text-white' : 'text-dark'}`} 
                            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                        >
                            <i className="bi bi-search fs-5"></i>
                        </button>

                        <button
                        className={`btn btn-link p-1 shadow-none theme-btn-mobile ${darkMode ? 'text-white' : 'text-dark'}`}
                        onClick={toggleDarkMode}
                    >
                        <i className={`bi fs-5 ${darkMode ? 'bi-moon-stars-fill' : 'bi-sun-fill text-warning'}`}></i>
                    </button>
                </div>

                    {/* 3. DESKTOP SEARCH BAR */}
                    <div className="d-none d-lg-flex position-relative align-items-center flex-grow-1 mx-lg-4 nav-search-container" style={{ maxWidth: '400px' }}>
                        <i className="bi bi-search position-absolute ms-3 text-secondary nav-search-icon"></i>
                        <input 
                            type="text" 
                            placeholder="Cerca visita..." 
                            className={`form-control rounded-pill ps-5 w-100 shadow-none nav-search-input ${darkMode ? 'bg-dark text-white border-secondary border-opacity-25' : 'bg-light text-dark border-0'}`} 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="d-none d-lg-flex align-items-center gap-2 ms-auto">
                        <a href="/editor-marketplace/" className={`nav-link fw-bold px-4 py-2 rounded-pill d-flex align-items-center justify-content-center gap-2 nav-hover-premium ${darkMode ? 'text-white' : 'text-dark'}`}>
                            <i className="bi bi-shop text-orange fs-5"></i> Marketplace
                        </a>

                        <div className={`vr mx-2 ${darkMode ? 'bg-white opacity-25' : 'bg-dark opacity-25'}`}></div>

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
                                    <div className="user-avatar rounded-circle bg-orange d-flex align-items-center justify-content-center avatar-hover-glow text-white fw-bold shadow-sm" style={{cursor: 'pointer'}}>
                                        <span>{user.name?.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <i className={`bi bi-chevron-down x-small chevron-icon ${darkMode ? 'text-white' : 'text-dark'}`}></i>
                                </button>

                                {/* Dropdown Menu Professionale */}
                                {userMenuOpen && (
                                    <div className="auth-dropdown-menu rounded-4 py-2 mt-2 position-absolute end-0 dropdown-animate-enter" style={{minWidth: '220px', zIndex: 1050}}>
                                        <div className={`dropdown-header-info px-4 py-2 border-bottom ${darkMode ? 'border-secondary border-opacity-25' : 'border-light'}`}>
                                            <div className="fw-bold user-name-text">{user.name}</div>
                                            <div className="x-small text-uppercase text-orange fw-bold">{user.permissions}</div>
                                        </div>

                                        {(user.permissions === 'admin' || user.permissions === 'editor' || user.permissions === 'docente') && (
                                            <a href="/editor/dashboard" className="dropdown-link-item">
                                                <i className="bi bi-grid-1x2 text-orange"></i>
                                                <span>Dashboard</span>
                                            </a>
                                        )}
                                        
                                        <a href="#" onClick={(e) => { e.preventDefault(); setIsProfileModalOpen(true); setUserMenuOpen(false); }} className="dropdown-link-item">
                                            <i className="bi bi-person-circle text-orange"></i>
                                            <span>Profilo</span>
                                        </a>

                                        <div className="dropdown-divider-custom"></div>

                                        <button onClick={handleLogout} className="btn btn-danger w-100 fw-bold text-white mt-2 rounded-3 border-0">
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <button className={`btn btn-link p-1 shadow-none ms-3 ${darkMode ? 'text-white' : 'text-dark'}`} onClick={toggleDarkMode}>
                            <i className={`bi fs-5 ${darkMode ? 'bi-moon-stars-fill' : 'bi-sun-fill text-warning'}`}></i>
                        </button>
                    </div>
                </div>

                {/* 5. MOBILE SEARCH POPUP DROPDOWN */}
                {mobileSearchOpen && (
                    <div className={`position-absolute top-100 start-0 w-100 p-3 shadow-lg border-bottom d-lg-none ${darkMode ? 'bg-dark border-secondary border-opacity-25' : 'bg-white border-light'}`} style={{ zIndex: 1040 }}>
                        <div className="position-relative">
                            <i className="bi bi-search position-absolute ms-3 top-50 translate-middle-y text-secondary"></i>
                            <input 
                                type="text" 
                                placeholder="Cerca visita..." 
                                className={`form-control rounded-pill ps-5 w-100 shadow-none ${darkMode ? 'bg-dark text-white border-secondary border-opacity-50' : 'bg-light text-dark border-1'}`} 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                )}
            </header>

            {/* HERO E CONNECT */}
            <div className="container-lg py-4 mt-5 pt-5">
                <div className="rounded-5 p-4 p-md-5 mb-5 navigator-hero-gradient shadow-lg position-relative">
                    <div className="row align-items-center position-relative" style={{ zIndex: 1 }}>
                        <div className="col-12 col-md-8 text-center text-md-start">
                            <h1 className="fw-black text-white display-4 mb-3" style={{ letterSpacing: '-1px' }}>Esplora le Visite</h1>
                            <p className="text-white lead mb-0 fw-medium" style={{ opacity: 0.9 }}>
                                Scegli una visita guidata e inizia il tuo percorso nel museo, oppure connettiti a un tour live.
                            </p>
                        </div>
                        <div className="col-md-4 d-none d-md-block text-end">
                            <i className="bi bi-compass text-white opacity-50 hero-icon-animated" style={{ fontSize: '9rem', marginRight: '-10px' }}></i>
                        </div>
                    </div>
                </div>

                {/* CONNECT CON CODICE */}
                <div className={`card border-0 rounded-4 shadow-sm overflow-hidden mb-5 live-tour-card ${bgCard}`} style={{ transform: 'translateY(-40px)', zIndex: 2, position: 'relative' }}>
                    <div className="card-body p-4 p-md-5 d-flex flex-column flex-md-row align-items-center justify-content-between gap-4">
                        <div className="text-center text-md-start">
                            <h3 className={`fw-bold mb-2 ${darkMode ? 'text-white' : 'text-dark'}`}>
                                <i className="bi bi-broadcast text-red me-2 glow-icon"></i>Visita in Diretta
                            </h3>
                            <p className={`${textMuted} mb-0 fw-medium`}>Inserisci il codice fornito dalla tua guida per connetterti al tour in tempo reale.</p>
                        </div>
                        <div className="d-flex w-100 rounded-pill glass-search-wrapper" style={{ maxWidth: '450px' }}>
                            <input 
                                type="text" 
                                className={`form-control form-control-lg border-0 rounded-start-pill ps-4 shadow-none bg-transparent ${darkMode ? 'text-white' : 'text-dark'}`} 
                                placeholder="Es. XYZ-123" 
                                style={{ outline: 'none' }}
                            />
                            <button 
                                className="btn btn-premium-red rounded-pill px-5 fw-bold shadow-sm d-flex align-items-center" 
                                style={{ transition: 'all 0.3s' }}
                                onClick={() => {
                                    // TODO: Implement the connection logic here.
                                    // 1. Validate the entered shortcode via backend API.
                                    // 2. If valid, open a WebSocket or WebRTC connection to the server for real-time state synchronization.
                                    // 3. Redirect the user to the active live session view (e.g. /live/:code).
                                    alert('Funzione in arrivo: Connessione in corso...');
                                }}
                            >
                                <i className="bi bi-link-45deg me-1 fs-5"></i> Entra
                            </button>
                        </div>
                    </div>
                </div>

                <div className="d-flex align-items-center mb-4 mt-5">
                    <h4 className={`fw-black mb-0 ${darkMode ? 'text-white' : 'text-dark'}`}>
                        <i className="bi bi-stars text-orange me-2"></i>Esperienze da Scoprire
                    </h4>
                    <div className={`ms-3 flex-grow-1 border-bottom ${darkMode ? 'border-secondary border-opacity-50' : 'border-secondary border-opacity-25'}`}></div>
                </div>

                {visite.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                    <div className="text-center py-5">
                        <i className={`bi bi-inbox ${textMuted} icon-5xl mb-3 d-block`}></i>
                        <h4 className="fw-bold">Nessuna visita disponibile</h4>
                        <p className={textMuted}>Torna più tardi per nuovi contenuti.</p>
                    </div>
                ) : (
                    <div className="row g-4 mt-2 mb-5 pb-5">
                        {visite.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase())).map(v => (
                            <div key={v._id} className="col-12 col-md-6 col-lg-4">
                                <div className={`card h-100 rounded-4 overflow-hidden shadow-sm card-hover-premium ${bgCard}`}>
                                    <div className="card-body p-4 d-flex flex-column">
                                        <h5 className={`fw-bold mb-1 ${darkMode ? 'text-white' : 'text-dark'}`}>{v.name}</h5>

                                        {v.museum_id && (
                                            <div className={`d-flex align-items-center gap-1 ${textMuted} small mb-3`}>
                                                <i className="bi bi-geo-alt-fill text-orange"></i>
                                                <span className="text-truncate">{v.museum_id.name || 'Museo sconosciuto'}</span>
                                            </div>
                                        )}

                                        <p className={`card-text small mb-4 flex-grow-1 ${textMuted}`}>
                                            {v.description && v.description.length > 100 ? v.description.substring(0, 100) + '...' : v.description || "Nessuna descrizione disponibile."}
                                        </p>
                                        
                                        <div className={`mt-auto pt-3 border-top d-flex align-items-center justify-content-between ${darkMode ? 'border-secondary border-opacity-50' : 'border-light'}`}>
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-person-walking text-orange me-2"></i>
                                                <span className={`fw-bold small ${darkMode ? 'text-white' : 'text-dark'}`}>{v.steps ? v.steps.length : 0}</span>
                                                <span className={`ms-1 small ${textMuted}`}>tappe</span>
                                            </div>
                                            <Link to={`/navigator/visit/${v._id}`} className="btn btn-outline-orange rounded-pill px-4 fw-bold btn-sm shadow-sm transition-theme">
                                                Inizia <i className="bi bi-arrow-right ms-1"></i>
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
            <footer className={`${bgFooter} py-4 mt-auto pb-5 mb-5 pb-lg-4 mb-lg-0`}>
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

            {/* MOBILE NAVIGATION (Bottom Bar) */}
            <nav className={`mobile-nav d-lg-none transition-theme shadow-lg ${darkMode ? 'bg-dark border-top border-secondary border-opacity-25' : 'bg-white'}`}>
                <a href="/navigator/" className="mobile-nav-item active">
                    <i className="bi bi-compass"></i>
                    <span>Naviga</span>
                </a>
                <a href="/editor-marketplace/" className="mobile-nav-item">
                    <i className="bi bi-shop"></i>
                    <span>Market</span>
                </a>

                {!user ? (
                    <a href="/login.html?redirect=/navigator/" className="mobile-nav-item">
                        <i className="bi bi-person"></i>
                        <span>Accedi</span>
                    </a>
                ) : (
                    <a href="#mobileProfileOffcanvas" data-bs-toggle="offcanvas" className="mobile-nav-item" onClick={(e) => e.preventDefault()}>
                        <div className={`user-avatar rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm border border-2 border-gold ${darkMode ? 'bg-teal text-cream' : 'bg-cream text-teal'}`} style={{ fontSize: '0.8rem' }}>
                            <span>{user.name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <span>Profilo</span>
                    </a>
                )}
            </nav>

            {/* OFFCANVAS PROFILO MOBILE */}
            <div className="offcanvas offcanvas-end border-0 shadow-lg" tabIndex="-1" id="mobileProfileOffcanvas">
                <div className={`offcanvas-body d-flex flex-column p-0 ${darkMode ? 'bg-dark' : 'bg-light'}`}>
                    
                    {/* User Banner */}
                    <div className={`position-relative p-4 p-md-5 text-center shadow-sm ${darkMode ? 'bg-gradient-dark-blue' : 'bg-gradient-orange'}`}>
                        <button type="button" className="btn-close btn-close-white position-absolute top-0 end-0 m-4" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                        {user && (
                            <div className="mt-3">
                                <div className={`user-avatar rounded-circle bg-white d-flex align-items-center justify-content-center fw-bold shadow mx-auto mb-3 ${darkMode ? 'text-dark' : 'text-orange'}`} style={{ width: '80px', height: '80px', fontSize: '2.5rem', border: '4px solid rgba(255,255,255,0.2)' }}>
                                    <span>{user.name?.charAt(0).toUpperCase()}</span>
                                </div>
                                <h4 className="fw-bold mb-1 text-white">{user.name}</h4>
                                <span className="badge bg-white bg-opacity-25 border border-white border-opacity-25 text-white mt-1 text-uppercase px-3 py-2 rounded-pill shadow-sm">{user.permissions}</span>
                            </div>
                        )}
                    </div>
                    
                    {/* Menu Links */}
                    <div className="p-4 d-flex flex-column gap-3 flex-grow-1">
                        {(user?.permissions === 'admin' || user?.permissions === 'editor' || user?.permissions === 'docente') && (
                            <a href="/editor/dashboard" className={`btn d-flex align-items-center gap-3 py-3 px-3 rounded-4 fw-bold shadow-sm hover-lift ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-0' : 'bg-white text-dark border-0'}`}>
                                <i className="bi bi-grid-1x2-fill fs-5 text-orange"></i>
                                <span>Dashboard</span>
                                <i className="bi bi-chevron-right ms-auto text-muted opacity-50"></i>
                            </a>
                        )}
                        
                        <a href="#" className={`btn d-flex align-items-center gap-3 py-3 px-3 rounded-4 fw-bold shadow-sm hover-lift ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-0' : 'bg-white text-dark border-0'}`} onClick={(e) => { e.preventDefault(); const offcanvas = document.getElementById('mobileProfileOffcanvas'); if(offcanvas) window.bootstrap.Offcanvas.getInstance(offcanvas)?.hide(); setIsProfileModalOpen(true); }}>
                            <i className="bi bi-person-circle fs-5 text-primary"></i>
                            <span>Profilo</span>
                            <i className="bi bi-chevron-right ms-auto text-muted opacity-50"></i>
                        </a>

                        <div className="mt-auto pt-4">
                            <button onClick={handleLogout} className="btn btn-danger py-3 rounded-pill fw-bold text-white w-100 shadow-sm border-0" data-bs-dismiss="offcanvas">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <ProfileModal 
                isOpen={isProfileModalOpen} 
                onClose={() => setIsProfileModalOpen(false)} 
                user={user} 
                onUpdate={(updatedUser) => setUser(updatedUser)} 
            />
        </div>
    );
}

export default VisitList;
