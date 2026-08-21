function artworkManager() {
    return {
        isReady: false,
        isLoggedIn: false,
        permissions: '',
        username: '',
        step: 'artwork-museum-select',

        museums: [],
        artworks: [],
        selectedMuseumId: '',

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
            type: 'success'
        },

        async init() {
            await this.checkAuth();
            if (this.isLoggedIn) {
                await this.fetchMuseums();
            } else {
                this.logout();
            }
            this.isReady = true;
        },

        async checkAuth() {
            const token = localStorage.getItem('artaround_token');
            if (!token) return;
            try {
                const res = await fetch('/api/check', {
                    method: 'POST',
                    headers: { 'Authorization': token }
                });
                if (res.ok) {
                    const data = await res.json();
                    this.isLoggedIn = true;
                    this.permissions = data.user.permissions;
                    this.username = data.user.name;
                }
            } catch (e) { this.isLoggedIn = false; }
        },

        logout() {
            localStorage.removeItem('artaround_token');
            window.location.href = '/login.html';
        },

        showToast(msg, type = 'success') {
            this.notification.message = msg;
            this.notification.type = type;
            this.notification.show = true;
            setTimeout(() => this.notification.show = false, 3000);
        },

        async fetchMuseums() {
            try {
                const res = await fetch('/api/museums', {
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });
                if (res.ok) this.museums = await res.json();
            } catch (e) { this.showToast("Errore caricamento musei", "error"); }
        },

        async fetchArtworks() {
            if (!this.selectedMuseumId) return;
            try {
                const res = await fetch(`/api/museums/${this.selectedMuseumId}/artworks`);
                if (res.ok) {
                    this.artworks = await res.json();
                    this.step = 'artwork-list';
                }
            } catch (e) { this.showToast("Errore caricamento opere", "error"); }
        },

        getMuseumName(id) {
            const m = this.museums.find(museo => museo._id === id);
            return m ? m.museum : 'Selezionato';
        },

        openArtworkForm(artwork = null) {
            if (artwork) {
                this.currentArtwork = { ...artwork };
            } else {
                this.currentArtwork = {
                    title: '', artist: '', image: '',
                    description: '', museum_id: this.selectedMuseumId
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
                    await this.fetchArtworks();
                    this.showToast("Opera salvata con successo!");
                } else {
                    this.showToast("Errore nel salvataggio", "error");
                }
            } catch (e) { this.showToast("Errore di connessione", "error"); }
        },

        async deleteArtwork(id) {
            if (!confirm("Eliminare questa opera?")) return;
            try {
                const res = await fetch(`/api/artworks/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });
                if (res.ok) {
                    await this.fetchArtworks();
                    this.showToast("Opera eliminata");
                }
            } catch (e) { this.showToast("Errore eliminazione", "error"); }
        }
    };
}
