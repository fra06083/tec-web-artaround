import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchVisita, fetchItemsByVisita } from './api';

function VisitDetail() {
    const { id } = useParams();
    const [visita, setVisita] = useState(null);
    const [items, setItems] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        Promise.all([fetchVisita(id), fetchItemsByVisita(id)])
            .then(([visitaData, itemsData]) => {
                setVisita(visitaData);
                setItems(itemsData);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div className="vh-100 d-flex flex-column align-items-center justify-content-center">
            <div className="spinner-border text-orange spinner-lg mb-4" role="status">
                <span className="visually-hidden">Caricamento...</span>
            </div>
            <h5 className="fw-bold">Caricamento visita...</h5>
        </div>
    );

    if (error) return (
        <div className="vh-100 d-flex flex-column align-items-center justify-content-center text-center px-4">
            <i className="bi bi-exclamation-triangle text-orange icon-5xl mb-3"></i>
            <h3 className="fw-bold">Errore</h3>
            <p className="text-white-50">{error}</p>
            <Link to="/visits" className="btn btn-outline-orange rounded-pill px-4">← Torna alla lista</Link>
        </div>
    );

    if (!visita) return (
        <div className="vh-100 d-flex flex-column align-items-center justify-content-center text-center">
            <i className="bi bi-question-circle text-white-50 icon-5xl mb-3"></i>
            <h3 className="fw-bold">Visita non trovata</h3>
            <Link to="/visits" className="btn btn-outline-orange rounded-pill px-4 mt-3">← Torna alla lista</Link>
        </div>
    );

    if (items.length === 0) return (
        <div className="min-vh-100 d-flex flex-column">
            <header className="navbar sticky-top py-3 shadow-sm bg-dark border-bottom border-secondary border-opacity-25">
                <div className="container">
                    <Link to="/visits" className="navbar-brand fw-bold fs-4 d-flex align-items-center gap-2 text-white">
                        <i className="bi bi-compass text-orange"></i> Navigator
                    </Link>
                </div>
            </header>
            <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center px-4">
                <i className="bi bi-inbox text-white-50 icon-5xl mb-3"></i>
                <h3 className="fw-bold">{visita.name}</h3>
                <p className="text-white-50">Nessuna opera in questa visita.</p>
                <Link to="/visits" className="btn btn-outline-orange rounded-pill px-4 mt-2">← Torna alla lista</Link>
            </div>
        </div>
    );

    const currentItem = items[currentIndex];

        return (
        <div className="min-vh-100 d-flex flex-column bg-dark">
            {/* NAVBAR */}
            <header className="navbar sticky-top py-3 shadow-sm bg-dark border-bottom border-secondary border-opacity-25">
                <div className="container d-flex justify-content-between align-items-center">
                    <Link to="/visits" className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-flex align-items-center gap-1">
                        <i className="bi bi-arrow-left"></i> Visite
                    </Link>
                    <span className="fw-bold text-white-50 small">
                        <i className="bi bi-compass text-orange me-1"></i> Navigator
                    </span> 
                    <span className="badge bg-orange rounded-pill">{currentIndex + 1} / {items.length}</span>
                </div>
            </header>

            {/* CONTENUTO */}
            <main className="flex-grow-1">
                <div className="container py-4">
                    {/* INFO VISITA */}
                    <div className="mb-4">
                        <h4 className="fw-bold mb-1">{visita.name}</h4>
                        {visita.museum_id && (
                            <div className="d-flex align-items-center gap-1 text-white-50 small">
                                <i className="bi bi-geo-alt-fill text-orange"></i>
                                <span>{visita.museum_id.museum} — {visita.museum_id.province}</span>
                            </div>
                        )}
                    </div>

                    {/* CARD OPERA */}
                    <div className="card border-0 rounded-4 shadow-sm bg-dark overflow-hidden">
                        {currentItem.img_path && (
                            <img
                                src={currentItem.img_path}
                                alt={currentItem.item}
                                className="card-img-top"
                            />
                        )}
                        <div className="card-body p-4">
                            <h2 className="fw-bold mb-3">{currentItem.item}</h2>

                            <div className="d-flex flex-wrap gap-3 mb-3">
                                <div className="d-flex align-items-center gap-2">
                                    <i className="bi bi-person text-orange"></i>
                                    <span className="small text-white-50">{currentItem.author}</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <i className="bi bi-file-earmark-text text-orange"></i>
                                    <span className="small text-white-50">{currentItem.license}</span>
                                </div>
                            </div>

                            {/* PLACEHOLDER PER STEP 3: qui andrà il testo del dialogo */}
                            <div className="rounded-4 p-4 mt-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                <p className="text-white-50 mb-0 text-center small">
                                    <i className="bi bi-chat-left-text me-2 text-orange"></i>
                                    I contenuti audio saranno disponibili a breve.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* NAVIGAZIONE */}
                    <div className="d-flex gap-3 justify-content-center mt-4">
                        <button
                            onClick={() => setCurrentIndex(i => i - 1)}
                            disabled={currentIndex === 0}
                            className="btn btn-outline-orange rounded-pill px-4 btn-with-icon"
                        >
                            <i className="bi bi-arrow-left"></i> Precedente
                        </button>
                        <button
                            onClick={() => setCurrentIndex(i => i + 1)}
                            disabled={currentIndex === items.length - 1}
                            className="btn btn-orange rounded-pill px-4 btn-with-icon"
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
                                className="btn p-0 border-0"
                            >
                                <div
                                    className={`rounded-circle ${i === currentIndex ? 'bg-orange' : 'bg-secondary'}`}
                                    style={{ width: '10px', height: '10px', transition: 'all 0.2s ease' }}
                                ></div>
                            </button>
                        ))}
                    </div>
                </div>
            </main>

            {/* FOOTER */}
            <footer className="bg-dark border-top border-secondary border-opacity-25 py-3 mt-auto">
                <div className="container text-center text-white-50 small">
                    &copy; 2026 ArtAround Navigator
                </div>
            </footer>
        </div>
    );
}

export default VisitDetail;