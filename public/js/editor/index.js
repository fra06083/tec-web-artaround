function marketplaceApp() {
    return {
        isLoggedIn: false,
        username: '',
        permissions: '',
        propic: '',
        isProfileModalOpen: false,
        profileForm: { name: '', propic: '' },
        isVisitSelectionModalOpen: false,
        roomState: { pin: null, students: [], eventSource: null },
        isLobbyModalOpen: false,
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
            
            // Set active sidebar link
            setTimeout(() => {
                const path = window.location.pathname;
                document.querySelectorAll('.nav-link-admin, .mobile-nav-item').forEach(link => {
                    const href = link.getAttribute('href');
                    if (href === path || (path === '/editor/' && href === '/editor/dashboard')) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }, 100);

            await this.checkAuth();
            await this.fetchTours();

            this.isLoading = false;
            if (this.permissions === 'admin') {
                this.refreshStats();
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
                    this.propic = data.user?.propic || '';
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
                const response = await fetch('/api/visite?manage=true', {
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
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

        openProfileModal() {
            this.profileForm.name = this.username;
            this.profileForm.propic = this.propic;
            this.isProfileModalOpen = true;
        },

        async updateProfile() {
            try {
                const token = localStorage.getItem('artaround_token');
                const response = await fetch('/api/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token
                    },
                    body: JSON.stringify(this.profileForm)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.username = data.user.name;
                    this.propic = data.user.propic;
                    localStorage.setItem('artaround_user', this.username);
                    this.isProfileModalOpen = false;
                    this.showToast('Profilo aggiornato con successo', 'success');
                } else {
                    const err = await response.json();
                    this.showToast(err.error || 'Errore aggiornamento profilo', 'error');
                }
            } catch (error) {
                console.error("Errore aggiornamento profilo:", error);
                this.showToast('Errore di connessione', 'error');
            }
        },

        showToast(message, type) {
            // Emette un custom event che sarà catturato da un eventuale componente toast globale,
            // oppure gestisce il toast localmente se lo implementiamo in index.html
            window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
        },

        openVisitSelection() {
            this.isVisitSelectionModalOpen = true;
        },

        closeVisitSelection() {
            this.isVisitSelectionModalOpen = false;
        },

        async createRoom(visitId) {
            try {
                const response = await fetch('/api/rooms/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ visitId, teacherId: this.username })
                });

                if (response.ok) {
                    const data = await response.json();
                    this.roomState.pin = data.pin;
                    this.roomState.students = [];
                    this.isVisitSelectionModalOpen = false;
                    this.isLobbyModalOpen = true;

                    if (this.roomState.eventSource) {
                        this.roomState.eventSource.close();
                    }
                    this.roomState.eventSource = new EventSource(`/api/rooms/events/${data.pin}`);
                    
                    this.roomState.eventSource.addEventListener('student-joined', (e) => {
                        const eventData = JSON.parse(e.data);
                        this.roomState.students = eventData.students;
                    });
                } else {
                    this.showToast('Errore creazione stanza', 'error');
                }
            } catch (error) {
                console.error("Errore creazione stanza:", error);
                this.showToast('Errore di connessione', 'error');
            }
        },

        async startVisit() {
            if (!this.roomState.pin) return;
            try {
                const response = await fetch('/api/rooms/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin: this.roomState.pin })
                });

                if (response.ok) {
                    this.showToast('Visita avviata! Gli studenti sono stati sincronizzati.', 'success');
                    const teacherLink = `/navigator/?role=teacher&pin=${this.roomState.pin}`;
                    window.open(teacherLink, '_blank');
                }
            } catch (error) {
                console.error("Errore avvio visita:", error);
            }
        },

        closeLobby() {
            this.isLobbyModalOpen = false;
            if (this.roomState.eventSource) {
                this.roomState.eventSource.close();
                this.roomState.eventSource = null;
            }
            this.roomState.pin = null;
        }
    };
}
