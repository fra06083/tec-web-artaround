function artworkManager() {
    return {
        // --- STATO DELL'INTERFACCIA ---
        isReady: false,
        isLoggedIn: false,
        permissions: '',
        username: '',
        step: 'artwork-museum-select', // Stato iniziale: scelta del museo

        // --- DATI ---
        museums: [],
        artworks: [],
        selectedMuseumId: '',

        // --- OGGETTO OPERA CORRENTE (Per il Form) ---
        currentArtwork: {
            title: '',
            artist: '',
            image: '',
            description: '',
            museum_id: ''
        },

        // --- NOTIFICHE ---
        notification: {
            show: false,
            message: '',
            type: 'success' // 'success' o 'error'
        },

        // --- INIZIALIZZAZIONE ---
        async init() {
            await this.checkAuth();
            if (this.isLoggedIn) {
                await this.fetchMuseums();
            } else {
                this.logout();
            }
            this.isReady = true;
        },

        // --- GESTIONE AUTENTICAZIONE ---
        async checkAuth() {
            const token = localStorage.getItem('artaround_token');
            const savedUsername = localStorage.getItem('artaround_user');

            if (!token) {
                this.isLoggedIn = false;
                return;
            }

            try {
                const response = await fetch('/api/check', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.username = data.user?.name || savedUsername;
                    this.permissions = data.user?.permissions;
                    this.isLoggedIn = true;
                } else {
                    this.logout();
                }
            } catch (error) {
                this.isLoggedIn = false;
            }
        },

        logout() {
            localStorage.removeItem('artaround_token');
            localStorage.removeItem('artaround_user');
            window.location.href = '/login.html';
        },

        showToast(msg, type = 'success') {
            this.notification.message = msg;
            this.notification.type = type;
            this.notification.show = true;
            setTimeout(() => {
                this.notification.show = false;
            }, 3000);
        },

        // --- LOGICA MUSEI (Per la Select) ---
        async fetchMuseums() {
            try {
                const res = await fetch('/api/museums', {
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });
                if (res.ok) {
                    this.museums = await res.json();
                }
            } catch (e) {
                this.showToast("Errore nel caricamento dei musei", "error");
            }
        },

        getMuseumName(id) {
            const m = this.museums.find(museo => museo._id === id);
            return m ? m.museum : 'Selezionato';
        },

        // --- LOGICA OPERE (ARTWORKS) ---
        async fetchArtworks() {
            if (!this.selectedMuseumId) return;

            try {
                // Chiamata alla rotta specifica per le opere di un museo
                const res = await fetch(`/api/museums/${this.selectedMuseumId}/artworks`, {
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });

                if (res.ok) {
                    this.artworks = await res.json();
                    this.step = 'artwork-list'; // Una volta caricate, mostra la tabella
                } else {
                    this.showToast("Impossibile caricare le opere", "error");
                }
            } catch (e) {
                this.showToast("Errore di connessione", "error");
            }
        },

        openArtworkForm(artwork = null) {
            if (artwork) {
                // Modifica: copio i dati dell'opera esistente
                this.currentArtwork = { ...artwork };
            } else {
                // Nuovo: resetto i campi e assegno il museo corrente
                this.currentArtwork = {
                    title: '',
                    artist: '',
                    image: '',
                    description: '',
                    museum_id: this.selectedMuseumId
                };
            }
            this.step = 'artwork-form';
        },

        async saveArtwork() {
            const isEdit = !!this.currentArtwork._id;
            const url = isEdit ? `/api/artworks/${this.currentArtwork._id}` : '/api/artworks';
            const method = isEdit ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': localStorage.getItem('artaround_token')
                    },
                    body: JSON.stringify(this.currentArtwork)
                });

                if (res.ok) {
                    this.showToast(isEdit ? "Opera aggiornata!" : "Nuova opera aggiunta!");
                    await this.fetchArtworks(); // Ricarica la tabella
                    this.step = 'artwork-list'; // Torna alla lista
                } else {
                    const err = await res.json();
                    this.showToast(err.error || "Errore nel salvataggio", "error");
                }
            } catch (e) {
                this.showToast("Errore server", "error");
            }
        },

        async deleteArtwork(id) {
            if (!confirm("Sei sicuro di voler eliminare definitivamente questa opera?")) return;

            try {
                const res = await fetch(`/api/artworks/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });

                if (res.ok) {
                    this.showToast("Opera eliminata con successo");
                    await this.fetchArtworks(); // Aggiorna la tabella
                } else {
                    this.showToast("Errore nell'eliminazione", "error");
                }
            } catch (e) {
                this.showToast("Errore di connessione", "error");
            }
        }
    };
}
