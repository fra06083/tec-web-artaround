import { useParams, Link } from 'react-router-dom';

function VisitDetail() {
    const { id } = useParams();

    return (
        <div>
            <h1>Visita in corso</h1>
            <p>ID visita: {id}</p>
            <p>Step 2: qui caricheremo le opere e la navigazione.</p>
            <Link to="/visits">← Torna alla lista</Link>
        </div>
    );
}

export default VisitDetail;