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

    if (loading) return <p>Caricamento visita...</p>;
    if (error) return <p>Errore: {error}</p>;
    if (!visita) return <p>Visita non trovata.</p>;
    if (items.length === 0) return (
        <div>
            <h1>{visita.name}</h1>
            <p>Nessuna opera in questa visita.</p>
            <Link to="/visits">← Torna alla lista</Link>
        </div>
    );

    const currentItem = items[currentIndex];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <Link to="/visits">← Torna alla lista</Link>
                <span>{currentIndex + 1} / {items.length}</span>
            </div>

            <h1>{visita.name}</h1>
            {visita.museum_id && (
                <p><small>{visita.museum_id.museum} — {visita.museum_id.province}</small></p>
            )}

            <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1.5rem', marginTop: '1rem' }}>
                <h2>{currentItem.item}</h2>

                {currentItem.img_path && (
                    <img
                        src={currentItem.img_path}
                        alt={currentItem.item}
                        style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '1rem' }}
                    />
                )}

                <p><strong>Autore:</strong> {currentItem.author}</p>
                <p><strong>Licenza:</strong> {currentItem.license}</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                <button
                    onClick={() => setCurrentIndex(i => i - 1)}
                    disabled={currentIndex === 0}
                    style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
                >
                    ← Precedente
                </button>
                <button
                    onClick={() => setCurrentIndex(i => i + 1)}
                    disabled={currentIndex === items.length - 1}
                    style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
                >
                    Prossimo →
                </button>
            </div>
        </div>
    );
}

export default VisitDetail;