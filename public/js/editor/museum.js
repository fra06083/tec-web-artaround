function museumManager() {
    return {
        // --- STATO SESSIONE & NAVIGAZIONE ---
        isLoggedIn: false,
        username: '',
        permissions: '',
        step: 'choice',
        isReady: false,

        // --- DATI ---
        museums: [],
        selectedMuseumId: '',
        artworks: [],

        // --- OGGETTI PER FORM (Sincronizzati con il Backend) ---
        currentMuseum: {
            museum: '',
            city: '',
            provence: '',
            region: '',
            description: '',
            image: ''
        },
        currentArtwork: {
            title: '',
            artist: '',
            image: '',
            description: '',
            museum_id: ''
        },
        notification: {
            show: false,
            message: '',
            type: 'success' // success o error
        },

        showToast(msg, type = 'success') {
            this.notification.message = msg;
            this.notification.type = type;
            this.notification.show = true;

            // Scompare automaticamente dopo 4 secondi
            setTimeout(() => {
                this.notification.show = false;
            }, 4000);
        },

        // --- AGGIORNA SAVE MUSEUM ---
        async init() {
            await this.checkAuth();
            if (this.isLoggedIn) {
                await this.fetchMuseums();
            } else {
                this.logout();
            }
            this.isReady = true;
        },

        getPageTitle() {
            const titles = {
                'choice': 'Dashboard Catalogo',
                'museum-list': 'Elenco Musei',
                'museum-form': 'Gestione Museo',
                'artwork-museum-select': 'Selezione Museo',
                'artwork-list': 'Catalogo Opere',
                'artwork-form': 'Scheda Opera'
            };
            return titles[this.step] || 'Amministrazione';
        },

        // --- LOGICA MUSEI ---
        async fetchMuseums() {
            try {
                const token = localStorage.getItem('artaround_token');

                const response = await fetch('/api/museums', {
                    method: 'GET', // Anche se è il default, metterlo aiuta a leggere meglio il codice
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token // Fondamentale: senza questo il backend ti darà 401
                    }
                });
                if (response.ok) {
                    this.museums = await response.json();
                } else {
                    // Se il token è scaduto o non valido (401 o 403)
                    if (response.status === 401 || response.status === 403) {
                        this.logout();
                    } else {
                        this.showToast("Impossibile caricare i musei", "error");
                    }
                }
            } catch (e) { console.error("Errore fetch musei:", e); }
        },

        openMuseumForm(museum = null) {
            if (museum) {
                this.currentMuseum = { ...museum };
            } else {
                this.currentMuseum = { museum: '', city: '', provence: '', region: '', description: '', image: '' };
            }
            this.step = 'museum-form';
        },

        async saveMuseum() {
            const isEdit = !!this.currentMuseum._id;
            const museumName = this.currentMuseum.museum; // Salviamo il nome per la notifica
            const url = isEdit ? `/api/museums/${this.currentMuseum._id}` : '/api/museums';
            const method = isEdit ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': localStorage.getItem('artaround_token')
                    },
                    body: JSON.stringify(this.currentMuseum)
                });

                if (res.ok) {
                    await this.fetchMuseums();
                    this.step = 'museum-list';
                    // NOTIFICA SUCCESSO
                    this.showToast(`Museo "${museumName}" salvato con successo!`, 'success');
                } else {
                    const err = await res.json();
                    // NOTIFICA ERRORE BACKEND
                    this.showToast(err.error || "Impossibile salvare il museo.", 'error');
                }
            } catch (e) {
                this.showToast("Errore di connessione al server.", 'error');
            }
        },

        // Puoi usarlo anche per l'eliminazione!
        async deleteMuseum(id) {
            if (!confirm("Eliminare definitivamente questo museo?")) return;
            try {
                const res = await fetch(`/api/museums/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });
                if (res.ok) {
                    await this.fetchMuseums();
                    this.showToast("Museo rimosso correttamente.", 'success');
                }
            } catch (e) {
                this.showToast("Errore durante l'eliminazione.", 'error');
            }
        },
        // --- LOGICA OPERE (ARTWORKS) ---
        async fetchArtworks() {
            if (!this.selectedMuseumId) return;
            try {
                // Utilizziamo la rotta specifica: /api/museums/:id/artworks
                const res = await fetch(`/api/museums/${this.selectedMuseumId}/artworks`);
                if (res.ok) {
                    this.artworks = await res.json();
                    this.step = 'artwork-list';
                }
            } catch (e) { console.error("Errore fetch opere:", e); }
        },

        openArtworkForm(artwork = null) {
            if (artwork) {
                this.currentArtwork = { ...artwork };
            } else {
                this.currentArtwork = {
                    title: '',
                    artist: '',
                    image: '',
                    description: '',
                    museum_id: this.selectedMuseumId // Colleghiamo automaticamente al museo selezionato
                };
            }
            this.step = 'artwork-form';
        },

        async saveArtwork() {
            const isEdit = !!this.currentArtwork._id;
            // Se è modifica usiamo la rotta con ID, se è nuovo usiamo la rotta generale /api/artworks
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
                    await this.fetchArtworks(); // Ricarica la lista per il museo corrente
                    this.step = 'artwork-list';
                } else {
                    const err = await res.json();
                    alert("Errore: " + err.error);
                }
            } catch (e) { alert("Errore nel salvataggio opera"); }
        },

        async deleteArtwork(id) {
            if (!confirm("Eliminare questa opera dal catalogo?")) return;
            try {
                const res = await fetch(`/api/artworks/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });
                if (res.ok) {
                    await this.fetchArtworks();
                }
            } catch (e) { alert("Errore nell'eliminazione"); }
        },

        // --- UTILITY ---
        getMuseumName(id) {
            const m = this.museums.find(museo => museo._id === id);
            return m ? m.museum : 'Museo non selezionato';
        },

        setMode(mode) {
            this.step = (mode === 'museums') ? 'museum-list' : 'artwork-museum-select';
        },

        async checkAuth() {
            try {
                const token = localStorage.getItem('artaround_token');
                const savedUsername = localStorage.getItem('artaround_user');
                if (!token) { this.isLoggedIn = false; return; }

                if (savedUsername) {
                    this.username = savedUsername;
                    this.isLoggedIn = true;
                }

                const response = await fetch('/api/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': token }
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
        }
    };
}
