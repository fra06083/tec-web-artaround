function marketplaceApp() {
    return {
        isLoggedIn: false,
        username: '',
        permissions: '',
        items: [],
        searchQuery: '',
        isLoading: true,
        isReady: false,
        darkMode: false,
        stats: {
            publishedTours: 0,
            totalDownloads: 0,
            activeUsers: 0,
            serverStatus: 'Offline'
        },
        async init() {
            // Load dark mode preference
            const savedDarkMode = localStorage.getItem('artaround_darkmode');
            this.darkMode = savedDarkMode === 'true';

            // Watch for dark mode changes
            this.$watch('darkMode', (value) => {
                localStorage.setItem('artaround_darkmode', value);
            });

            await this.checkAuth();
            await this.fetchTours();

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
                const token = localStorage.getItem('artaround_token'); // Recupera il token
                const response = await fetch('/editor/stats', {
                    method: "GET",
                    'Authorization': token
                });
                if (response.ok) {
                    this.stats = await response.json();
                }
            } catch (error) {
                console.error("Errore caricamento statistiche:", error);
            }
        },
        async fetchTours() {
            try {
                const response = await fetch('/api/visite');
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
