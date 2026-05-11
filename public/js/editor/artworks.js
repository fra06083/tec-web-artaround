function artworkManager() {
    return {
        // UI STATE
        isReady: false,
        isLoggedIn: false,
        permissions: '',
        username: '',
        step: 'artwork-museum-select', // initial state: museum selection

        // DATA
        museums: [],
        artworks: [],
        selectedMuseumId: '',

        // CURRENT ARTWORK OBJECT (For Form)
        currentArtwork: {
            item: '',
            img_path: '',
            museum_id: '',
            author: '',
            license: '',
            description: '',
            desc_type: 'medio' // default
        },

        // NOTIFICATION
        notification: {
            show: false,
            message: '',
            type: 'success' // 'success' or 'error'
        },

        // INITIALIZATION
        async init() {
            await this.checkAuth();
            if (this.isLoggedIn) {
                await this.fetchMuseums();
            } else {
                this.logout();
            }
            this.isReady = true;
        },

        // AUTHENTICATION
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
            // clear session and redirect to login
            localStorage.removeItem('artaround_token');
            localStorage.removeItem('artaround_user');
            window.location.href = '/login.html';
        },

        showToast(msg, type = 'success') {
            // display notification message
            this.notification.message = msg;
            this.notification.type = type;
            this.notification.show = true;
            setTimeout(() => {
                this.notification.show = false;
            }, 3000);
        },

        // MUSEUM LOGIC (For Select)
        async fetchMuseums() {
            // load available museums for dropdown
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
            // get museum name by ID
            const m = this.museums.find(museo => museo._id === id);
            return m ? m.museum : 'Selezionato';
        },

        // ARTWORK LOGIC
        async fetchArtworks() {
            // load artworks for selected museum
            if (!this.selectedMuseumId) return;

            try {
                const res = await fetch(`/api/artworks/museum/${this.selectedMuseumId}`, {
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });

                if (res.ok) {
                    this.artworks = await res.json();
                    this.step = 'artwork-list'; // show table once loaded
                } else {
                    this.showToast("Impossibile caricare le opere", "error");
                }
            } catch (e) {
                this.showToast("Errore di connessione", "error");
            }
        },

        openArtworkForm(artwork = null) {
            // open form for new or existing artwork
            if (artwork) {
                // copy existing artwork data for editing
                this.currentArtwork = {
                    _id: artwork._id,
                    item: artwork.item || '',
                    img_path: artwork.img_path || '',
                    museum_id: artwork.museum_id || this.selectedMuseumId,
                    author: artwork.author || '',
                    license: artwork.license || '',
                    description: artwork.description || '',
                    desc_type: artwork.desc_type || 'medio'
                };
            } else {
                // reset fields for new artwork
                this.currentArtwork = {
                    item: '',
                    img_path: '',
                    museum_id: this.selectedMuseumId,
                    author: '',
                    license: '',
                    description: '',
                    desc_type: 'medio'
                };
            }
            this.step = 'artwork-form';
        },

        async saveArtwork() {
            // create or update artwork
            // validation
            if (!this.currentArtwork.item || !this.currentArtwork.img_path ||
                !this.currentArtwork.museum_id || !this.currentArtwork.author || !this.currentArtwork.license) {
                this.showToast("Compila tutti i campi obbligatori", "error");
                return;
            }

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
                    this.showToast(isEdit ? "Opera aggiornata con successo!" : "Nuova opera aggiunta!");
                    await this.fetchArtworks(); // reload table
                    this.step = 'artwork-list'; // back to list
                } else {
                    const err = await res.json();
                    this.showToast(err.error || "Errore nel salvataggio", "error");
                }
            } catch (e) {
                this.showToast("Errore server", "error");
            }
        },

        async deleteArtwork(id) {
            // delete artwork with confirmation
            if (!confirm("Sei sicuro di voler eliminare definitivamente questa opera?")) return;

            try {
                const res = await fetch(`/api/artworks/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });

                if (res.ok) {
                    this.showToast("Opera eliminata con successo");
                    await this.fetchArtworks(); // update table
                } else {
                    this.showToast("Errore nell'eliminazione", "error");
                }
            } catch (e) {
                this.showToast("Errore di connessione", "error");
            }
        }
    };
}
