import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchVisite } from './api';

function VisitList() {
    const [visite, setVisite] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchVisite()
            .then(data => setVisite(data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="vh-100 d-flex flex-column align-items-center justify-content-center">
            <div className="spinner-border text-orange spinner-lg mb-4" role="status">
                <span className="visually-hidden">Caricamento...</span>
            </div>
            <h5 className="fw-bold">Caricamento visite...</h5>
        </div>
    );

    if (error) return (
        <div className="vh-100 d-flex flex-column align-items-center justify-content-center text-center px-4">
            <i className="bi bi-exclamation-triangle text-orange icon-5xl mb-3"></i>
            <h3 className="fw-bold">Errore</h3>
            <p className="text-white-50">{error}</p>
            <button onClick={() => window.location.reload()} className="btn btn-outline-orange rounded-pill px-4 mt-2">
                Riprova
            </button>
        </div>
    );

        return (
        <div className="min-vh-100 d-flex flex-column">
            {/* NAVBAR */}
            <header className="navbar sticky-top py-3 shadow-sm bg-dark border-bottom border-secondary border-opacity-25">
                <div className="container d-flex justify-content-between align-items-center">
                    <a href="/" className="navbar-brand fw-bold fs-4 d-flex align-items-center gap-2 text-white">
                        <i className="bi bi-compass text-orange"></i> Navigator
                    </a>
                    <a href="/" className="btn btn-outline-secondary btn-sm rounded-pill px-3">
                         <i className="bi bi-house me-1"></i> ArtAround
                    </a>
                </div>
            </header>

            {/* HERO */}
            <div className="container py-4">
                <div className="rounded-5 p-4 p-md-5 mb-4 bg-orange overflow-hidden">
                    <div className="row align-items-center">
                        <div className="col-12 col-md-8 text-center text-md-start">
                            <h1 className="fw-bold text-white display-5 mb-2">Esplora le Visite</h1>
                            <p className="text-white lead mb-0" style={{ opacity: 0.85 }}>
                                Scegli una visita guidata e inizia il tuo percorso nel museo.
                            </p>
                        </div>
                        <div className="col-md-4 d-none d-md-block text-end">
                            <i className="bi bi-map text-white icon-5xl" style={{ opacity: 0.25 }}></i>
                        </div>
                    </div>
                </div>

                {visite.length === 0 ? (
                    <div className="text-center py-5">
                        <i className="bi bi-inbox text-white-50 icon-5xl mb-3 d-block"></i>
                        <h4 className="fw-bold">Nessuna visita disponibile</h4>
                        <p className="text-white-50">Torna più tardi per nuovi contenuti.</p>
                    </div>
                ) : (
                    <div className="row g-4">
                        {visite.map(v => (
                            <div key={v._id} className="col-12 col-md-6 col-lg-4">
                                <div className="card h-100 border-0 rounded-4 overflow-hidden shadow-sm bg-dark">
                                    <div className="card-body p-4 d-flex flex-column">
                                        <h5 className="fw-bold mb-1">{v.name}</h5>

                                        {v.museum_id && (
                                            <div className="d-flex align-items-center gap-1 text-white-50 small mb-3">
                                                <i className="bi bi-geo-alt-fill text-orange"></i>
                                                <span>{v.museum_id.museum} — {v.museum_id.province}</span>
                                            </div>
                                        )}

                                        {v.description && (
                                            <p className="text-white-50 small flex-grow-1">{v.description}</p>
                                        )}

                                        <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary border-opacity-25">
                                            <span className="text-white-50 small">
                                                <i className="bi bi-collection me-1"></i>
                                                {v.items?.length || 0} opere
                                            </span>
                                            <Link to={`/visit/${v._id}`} className="btn btn-orange rounded-pill px-3 fw-bold btn-sm">
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
            <footer className="bg-dark border-top border-secondary border-opacity-25 py-4 mt-auto">
                <div className="container text-center text-white-50 small">
                    &copy; 2026 ArtAround. All rights reserved.
                </div>
            </footer>
        </div>
    );
}

export default VisitList;
