const API_BASE = '/api';

export async function fetchVisite() {
    const token = localStorage.getItem('artaround_token');
    if (!token) return [];

    const res = await fetch(`${API_BASE}/my-visits`, {
        headers: {
            'Authorization': token
        }
    });
    if (!res.ok) throw new Error('Errore nel caricamento visite (acquistate)');
    return res.json();
}

export async function fetchMuseums() {
    const res = await fetch(`${API_BASE}/musei`);
    if (!res.ok) return [];
    return res.json();
}

export async function fetchVisita(id, pin = '') {
    const token = localStorage.getItem('artaround_token');
    const url = pin ? `${API_BASE}/visite/${id}?pin=${encodeURIComponent(pin)}` : `${API_BASE}/visite/${id}`;
    const res = await fetch(url, {
        headers: token ? { 'Authorization': token } : {}
    });
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

export async function fetchQuizByVisita(id) {
    const res = await fetch(`${API_BASE}/visite/${id}/quiz`);
    if (!res.ok) throw new Error('Errore nel caricamento quiz');
    return res.json();
}

export function getUser() {
    const token = localStorage.getItem('artaround_token');
    if (!token) return null;

    let userObj = null;
    
    // decodifica il payload jwt client-side per estrarre permessi e dati utente
    try {
        userObj = JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }

    const savedStr = localStorage.getItem('artaround_user');
    if (savedStr) {
        try {
            const parsed = JSON.parse(savedStr);
            if (typeof parsed === 'object' && parsed !== null) {
                userObj = { ...userObj, ...parsed };
            }
        } catch (e) {}
    }

    return userObj;
}

export async function fetchUser() {
    const token = localStorage.getItem('artaround_token');
    if (!token) return null;
    
    try {
        const res = await fetch('/api/check', {
            method: 'POST',
            headers: { 'Authorization': token }
        });
        if (res.ok) {
            const data = await res.json();
            // Restituisce l'oggetto utente completo con propic
            return {
                id: data.user.id,
                name: data.user.name,
                permissions: data.user.permissions,
                propic: data.user.propic
            };
        }
    } catch (e) {
        console.error("Errore fetch user", e);
    }
    // Fallback al token locale
    return getUser();
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