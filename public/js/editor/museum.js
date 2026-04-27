function museumManager() {
    return {
        // --- STATO SESSIONE & NAVIGAZIONE ---
        isLoggedIn: false,
        username: '',
        permissions: '',
        step: 'museum-list',
        isReady: false,

        // --- DATI ---
        museums: [],
        selectedMuseumId: '',
        artworks: [],

        // --- OGGETTI PER FORM (Sincronizzati con il Backend) ---
        currentMuseum: {
            museum: '',
            city: '',
            province: '',
            region: '',
            address: '',
            description: '',
            image: ''
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
                this.currentMuseum = { museum: '', city: '', province: '', region: '', description: '', image: '' };
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

        // --- UTILITY ---
        getMuseumName(id) {
            const m = this.museums.find(museo => museo._id === id);
            return m ? m.museum : 'Museo non selezionato';
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
