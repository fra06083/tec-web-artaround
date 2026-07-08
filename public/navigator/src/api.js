const API_BASE = '/api';

export async function fetchVisite() {
    const token = localStorage.getItem('artaround_token');
    if (!token) return []; // Se non è loggato, nessuna visita

    const res = await fetch(`${API_BASE}/my-visits`, {
        headers: {
            'Authorization': token
        }
    });
    if (!res.ok) throw new Error('Errore nel caricamento visite (acquistate)');
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

export async function fetchDescriptionsByItem(id) {
    const res = await fetch(`${API_BASE}/artworks/${id}/descriptions`);
    if (!res.ok) throw new Error('Errore nel caricamento descrizioni');
    return res.json();
}

export function getUser() {
    const token = localStorage.getItem('artaround_token');
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload;
    } catch {
        return null;
    }
}

export function getDarkMode() {
    return localStorage.getItem('artaround_darkmode') === 'true';
}

export function setDarkMode(value) {
    localStorage.setItem('artaround_darkmode', value);
}

export function logout() {
    localStorage.removeItem('artaround_token');
    localStorage.removeItem('artaround_user');
}
