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

    if (loading) return <p>Caricamento visite...</p>;
    if (error) return <p>Errore: {error}</p>;
    if (visite.length === 0) return <p>Nessuna visita disponibile.</p>;

    return (
        <div>
            <h1>Visite Disponibili</h1>
            <div>
                {visite.map(v => (
                    <div key={v._id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem', borderRadius: '8px' }}>
                        <h3>{v.name}</h3>
                        {v.description && <p>{v.description}</p>}
                        {v.museum_id && <p><small>{v.museum_id.museum} — {v.museum_id.province}</small></p>}
                        <Link to={`/visit/${v._id}`}>Inizia visita</Link>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default VisitList;
