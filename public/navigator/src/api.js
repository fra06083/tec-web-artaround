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
    // grab the jwt token to check if we are logged in
    const token = localStorage.getItem('artaround_token');
    if (!token) return null;

    let userObj = null;
    
    // decode the base64 jwt payload
    // we do this first because the token always has the correct user roles/permissions!
    try {
        userObj = JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }

    // grab any updated user data from local storage
    // (e.g. if the user just updated their profile picture)
    const savedStr = localStorage.getItem('artaround_user');
    if (savedStr) {
        try {
            const parsed = JSON.parse(savedStr);
            // merge the local storage data ON TOP of the jwt payload
            // this way we get fresh propics without accidentally deleting permissions
            if (typeof parsed === 'object' && parsed !== null) {
                userObj = { ...userObj, ...parsed };
            }
        } catch (e) {
            // ignore errors if savedStr is just a raw string like "admin"
        }
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
