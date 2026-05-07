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

    if (loading) return <p className="text-center mt-5">Caricamento visita...</p>;
    if (error) return <p className="text-center mt-5 text-danger">Errore: {error}</p>;
    if (!visita) return <p className="text-center mt-5">Visita non trovata.</p>;
    if (items.length === 0) return (
        <div className="container py-5">
            <h1>{visita.name}</h1>
            <p>Nessuna opera in questa visita.</p>
            <Link to="/visits" className="btn btn-outline-secondary">← Torna alla lista</Link>
        </div>
    );

    const currentItem = items[currentIndex];

    return (
        <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <Link to="/visits" className="btn btn-outline-secondary btn-sm">← Torna alla lista</Link>
                <span className="badge bg-orange">{currentIndex + 1} / {items.length}</span>
            </div>

            <h1 className="fw-bold">{visita.name}</h1>
            {visita.museum_id && (
                <p className="text-muted">{visita.museum_id.museum} — {visita.museum_id.province}</p>
            )}

            <div className="card border-0 shadow-sm rounded-4 mt-3">
                <div className="card-body p-4">
                    <h2 className="card-title fw-bold">{currentItem.item}</h2>

                    {currentItem.img_path && (
                        <img
                            src={currentItem.img_path}
                            alt={currentItem.item}
                            className="img-fluid rounded-4 mb-3 w-100"
                        />
                    )}

                    <p><strong>Autore:</strong> {currentItem.author}</p>
                    <p className="mb-0"><strong>Licenza:</strong> {currentItem.license}</p>
                </div>
            </div>

            <div className="d-flex gap-3 justify-content-center mt-4">
                <button
                    onClick={() => setCurrentIndex(i => i - 1)}
                    disabled={currentIndex === 0}
                    className="btn btn-outline-orange rounded-pill px-4"
                >
                    ← Precedente
                </button>
                <button
                    onClick={() => setCurrentIndex(i => i + 1)}
                    disabled={currentIndex === items.length - 1}
                    className="btn btn-orange rounded-pill px-4"
                >
                    Prossimo →
                </button>
            </div>
        </div>
    );
}

export default VisitDetail;