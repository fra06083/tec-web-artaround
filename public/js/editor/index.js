function marketplaceApp() {
    return {
        isLoggedIn: false,
        username: '',
        permissions: '',
        items: [],
        cart: [],
        purchasedVisits: [],
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
        get cartCount() {
            return this.cart.length;
        },
        get filteredItems() {
            if (!this.searchQuery || this.searchQuery.trim() === '') {
                return this.items;
            }
            const query = this.searchQuery.toLowerCase().trim();
            return this.items.filter(tour => {
                const name = tour.name?.toLowerCase() || '';
                const museum = tour.museum_id?.museum?.toLowerCase() || '';
                const description = tour.description?.toLowerCase() || '';
                return name.includes(query) || museum.includes(query) || description.includes(query);
            });
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
                    this.purchasedVisits = data.user?.purchased_visits || [];
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
        },

        isPurchased(tourId) {
            return this.purchasedVisits.includes(tourId);
        },

        isInCart(tourId) {
            return this.cart.some(item => item._id === tourId);
        },

        addToCart(tour) {
            if (!this.isInCart(tour._id)) {
                this.cart.push(tour);
                this.showToast('Tour aggiunto al carrello!', 'success');
            } else {
                this.showToast('Il tour è già nel carrello!', 'warning');
            }
        },

        removeFromCart(tourId) {
            this.cart = this.cart.filter(item => item._id !== tourId);
        },

        editTour(tourId) {
            window.location.href = `/editor/tours?id=${tourId}`;
        },

        async deleteTour(tourId) {
            if (!confirm('Sei sicuro di voler eliminare questo tour? Verrà rimosso definitivamente.')) return;
            try {
                const token = localStorage.getItem('artaround_token');
                const response = await fetch(`/api/visite/${tourId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': token }
                });
                if (response.ok) {
                    this.items = this.items.filter(i => i._id !== tourId);
                    this.refreshStats();
                    if(typeof this.showToast === 'function') {
                        this.showToast('Tour eliminato con successo', 'success');
                    } else {
                        alert('Tour eliminato con successo');
                    }
                } else {
                    if(typeof this.showToast === 'function') {
                        this.showToast('Errore durante l\'eliminazione', 'error');
                    } else {
                        alert('Errore durante l\'eliminazione');
                    }
                }
            } catch (error) {
                console.error("Errore deleteTour:", error);
            }
        },

        async checkout() {
            if (!this.isLoggedIn) {
                window.location.href = '../login.html';
                return;
            }
            if (this.cart.length === 0) return;

            try {
                const token = localStorage.getItem('artaround_token');
                const visitIds = this.cart.map(item => item._id);

                const response = await fetch('/api/buy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token
                    },
                    body: JSON.stringify({ visits: visitIds })
                });

                if (response.ok) {
                    this.purchasedVisits = [...this.purchasedVisits, ...visitIds];
                    this.cart = []; // Svuota carrello
                    this.showToast('Acquisto completato con successo!', 'success');
                } else {
                    this.showToast('Errore durante l\'acquisto.', 'error');
                }
            } catch (error) {
                console.error('Errore checkout:', error);
                this.showToast('Errore di connessione.', 'error');
            }
        },

        showToast(message, type) {
            // Emette un custom event che sarà catturato da un eventuale componente toast globale,
            // oppure gestisce il toast localmente se lo implementiamo in index.html
            window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
        }
    };
}
