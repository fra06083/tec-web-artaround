document.addEventListener('alpine:init', () => {
    Alpine.data('usersManager', () => ({
        isReady: false,
        username: '',
        search: '',
        users: [],
        allMuseums: [],
        selectedUser: null,
        selectedMuseumId: '',
        pendingRequests: [],

        async init() {
            // 1. Controllo sicurezza (come nel tuo originale)
            const token = localStorage.getItem('artaround_token');
            if (!token) return window.location.href = '../index.html';

            try {
                // Verifica auth e permessi admin
                const authRes = await fetch('/api/check', {
                    method: 'POST',
                    headers: { 'Authorization': token }
                });

                const authData = await authRes.json();

                if (!authRes.ok || authData.user.permissions !== 'admin') {
                    window.location.href = '../index.html';
                    return;
                }

                this.username = authData.user.name;

                // 2. Caricamento dati iniziali per la gestione
                await this.loadMuseums();
                await this.loadPendingRequests();

                // Carica inizialmente tutti gli editor (come facevi tu)
                const usersRes = await fetch('/editor/user-management/search?q=', {
                    headers: { 'Authorization': token }
                });
                this.users = await usersRes.json();

                // Close user menu when clicking outside
                document.addEventListener('click', (e) => {
                    const menu = document.querySelector('.mobile-user-menu');
                    const btn = document.querySelector('.mobile-user-btn');
                    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
                        this.userMenuOpen = false;
                    }
                });

            } catch (error) {
                console.error("Errore inizializzazione:", error);
            } finally {
                this.isReady = true;
            }
        },

        async loadMuseums() {
            const res = await fetch('/api/museums');
            this.allMuseums = res.ok ? await res.json() : [];
        },

        async loadPendingRequests() {
            // not implemented yet
            this.pendingRequests = [];
        },

        // Ricerca dinamica
        async searchUsers() {
            if (this.search.length < 2) return;
            const res = await fetch(`/editor/user-management/search?q=${encodeURIComponent(this.search)}`);
            this.users = res.ok ? await res.json() : [];
        },

        // Seleziona un utente specifico per vederne i dettagli
        async selectUser(userId) {
            const token = localStorage.getItem('artaround_token');
            const res = await fetch(`/editor/user-management/${userId}`, {
                headers: {'Authorization': token}
            });
            if (!res.ok) return;
            this.selectedUser = await res.json();
            this.selectedMuseumId = '';
        },

        // Aggiunge un museo alla lista dell'autore
        async grantPermission() {
            if (!this.selectedMuseumId || !this.selectedUser) return;

            const token = localStorage.getItem('artaround_token');

            const res = await fetch(`/editor/user-management/${this.selectedUser._id}/museums/${this.selectedMuseumId}`, {
                method: 'POST',
                headers: {'Authorization': token}
            });

            if (res.ok) {
                this.selectedUser = await res.json(); // Backend deve restituire l'utente aggiornato con .populate('museums')
                this.selectedMuseumId = '';
            }
        },

        // Rimuove un museo (Revoke)
        async revokePermission(museumId) {
            const token = localStorage.getItem('artaround_token');
            const res = await fetch(`/editor/user-management/${this.selectedUser._id}/museums/${museumId}`, {
                method: 'DELETE',
                headers: {'Authorizazion': token}
            });

            if (res.ok) {
                this.selectedUser = await res.json();
            }
        },

        logout() {
            localStorage.removeItem('artaround_token');
            window.location.href = '../index.html';
        }
    }));
});
