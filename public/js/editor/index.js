function marketplaceApp() {
    return {
        isLoggedIn: false,
        username: '',
        permissions: '',
        items: [],
        searchQuery: '', // cose che vengono scritte nella barra di ricerca
        isLoading: true, // true di default così nella console non rompe le balle
        isReady: false,
        stats: {
            publishedTours: 0,
            totalDownloads: 0,
            activeUsers: 0,
            serverStatus: 'Offline'
        },
        async init() {
            // veriFICA del token all'avvio
            await this.checkAuth();

            // se loggato, si caricano i dati, altrimenti si resta in modalità "ospite"
            // o si potrebbe reindirizzare da qualche parte idk
            if (this.isLoggedIn) {
                await this.fetchTours();
            }

            this.isLoading = false;
            this.refreshStats();
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

                // pre caricamento del nome dal localStorage per evitare che sparisca quando si refresha la pagina
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
                    // Se il backend restituisce il nome, usiamo quello, altrimenti teniamo quello del localStorage
                    this.username = data.user?.name || savedUsername;
                    this.permissions = data.user?.permissions;
                    this.isLoggedIn = true;
                } else {
                    // Se il token è scaduto o non valido, puliamo tutto
                    this.logout();
                }
            } catch (error) {
                console.error('Errore durante il controllo autorizzazione:', error);
                this.isLoggedIn = false;
            }
        },
        async refreshStats() {
            try {
                const response = await fetch('/admin/stats');
                if (response.ok) {
                    this.stats = await response.json();
                }
            } catch (error) {
                console.error("Errore caricamento statistiche:", error);
            }
        },
        async fetchTours() {
            try {
                const token = localStorage.getItem('artaround_token');
                // manca la gestione della rotta /api/tours :3
                const response = await fetch('/api/tours', {
                    method: 'GET',
                    headers: {
                        'Authorization': token
                    }
                });

                if (response.ok) {
                    this.items = await response.json();
                }
            } catch (error) {
                console.error('Errore fetch tours:', error);
            }
        },

        logout() {
            localStorage.removeItem('artaround_token');
            localStorage.removeItem('artaround_user');
            window.location.reload();
        }
    };
}
