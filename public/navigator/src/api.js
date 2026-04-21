const API_BASE = '/api';

export async function fetchVisite() {
    const res = await fetch(`${API_BASE}/visite`);
    if (!res.ok) throw new Error('Errore nel caricamento visite');
    return res.json();
}

export async function fetchVisita(id) {
    const res = await fetch(`${API_BASE}/visite/${id}`);
    if (!res.ok) throw new Error('Errore nel caricamento visita');
    return res.json();
}

export async function fetchItemsByVisita(id) {
    const res = await fetch(`${API_BASE}/visite/${id}/items`);
    if (!res.ok) throw new Error('Errore nel caricamento items');
    return res.json();
}