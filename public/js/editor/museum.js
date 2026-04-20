function museumManager() {
    return {
        // Stato Sessione
        isLoggedIn: false,
        username: '',
        permissions: '',

        // Stato Navigazione
        step: 'choice', // choice, museum-list, museum-form, artwork-museum-select, artwork-list, artwork-form
        isReady: false,

        // Dati
        museums: [],
        selectedMuseumId: '',
        artworks: [],

        async init() {
            // 1. Prima verifichiamo chi è l'utente
            await this.checkAuth();

            // 2. Se è loggato, carichiamo i dati necessari
            if (this.isLoggedIn) {
                await this.fetchMuseums();
            } else {
                // Se per qualche motivo il middleware ha fallito o il token è sparito
                this.logout();
                return;
            }

            this.isReady = true;
        },

        async checkAuth() {
            try {
                const token = localStorage.getItem('artaround_token');
                const savedUsername = localStorage.getItem('artaround_user');

                if (!token) {
                    this.isLoggedIn = false;
                    return;
                }

                // Caricamento ottimistico
                if (savedUsername) {
                    this.username = savedUsername;
                    this.isLoggedIn = true;
                }

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
                console.error('Errore auth:', error);
                this.isLoggedIn = false;
            }
        },

        async fetchMuseums() {
            try {
                const token = localStorage.getItem('artaround_token');
                //            const res = await fetch('/api/museums', {
                //         headers: { 'Authorization': token } // Fondamentale per il middleware auth del backend
                //       });

                //          if (res.ok) {
                //            this.museums = await res.json();
                //        }
            } catch (e) {
                console.error("Errore fetch musei:", e);
            }
        },

        setMode(mode) {
            if (mode === 'museums') {
                this.step = 'museum-list';
            } else {
                this.step = 'artwork-museum-select';
            }
        },

        logout() {
            localStorage.removeItem('artaround_token');
            localStorage.removeItem('artaround_user');
            // Reindirizza alla login per evitare che l'utente rimanga su una pagina admin vuota
            window.location.href = '/login';
        }
    }
}
