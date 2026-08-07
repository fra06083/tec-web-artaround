function marketplaceApp() {
    return {
        isLoggedIn: false,
        username: '',
        permissions: '',
        propic: '',
        isProfileModalOpen: false,
        profileForm: { name: '', propic: '', nameError: '' },
        isVisitSelectionModalOpen: false,
        visitSearchQuery: '',
        roomState: { pin: null, students: [], eventSource: null },
        isLobbyModalOpen: false,
        items: [],
        cart: [],
        purchasedVisits: [],
        searchQuery: '',
        isLoading: true,
        isReady: false,
        isCartOpen: false,
        darkMode: false,
        stats: {
            publishedTours: 0,
            totalDownloads: 0,
            activeUsers: 0,
            serverStatus: 'Offline'
        },
        tagSearchQuery: '',
        get filteredSelectionVisits() {
            if (!this.visitSearchQuery || !this.visitSearchQuery.trim()) {
                return this.items;
            }
            const q = this.visitSearchQuery.toLowerCase().trim();
            return this.items.filter(tour => {
                const name = tour.name?.toLowerCase() || '';
                const museum = tour.museum_id?.museum?.toLowerCase() || '';
                return name.includes(q) || museum.includes(q);
            });
        },

        get availableTags() {
            const tagsSet = new Set();
            this.items.forEach(tour => {
                if (tour.tags && Array.isArray(tour.tags)) {
                    tour.tags.forEach(t => tagsSet.add(t));
                }
            });
            return Array.from(tagsSet).sort();
        },
        get filteredAvailableTags() {
            if (!this.tagSearchQuery || this.tagSearchQuery.trim() === '') {
                const tagsToShow = [...this.selectedTags];
                for (let tag of this.availableTags) {
                    if (tagsToShow.length >= 5) break;
                    if (!tagsToShow.includes(tag)) {
                        tagsToShow.push(tag);
                    }
                }
                return tagsToShow;
            }
            const query = this.tagSearchQuery.toLowerCase().trim();
            return this.availableTags.filter(t => t.toLowerCase().includes(query));
        },
        selectedTags: [],
        get cartCount() {
            return this.cart.length;
        },
        get cartTotal() {
            return (this.cart.length * 12).toFixed(2).replace('.', ',');
        },
        get filteredItems() {
            let result = this.items;
            
            // Nascondi i tour già acquistati dal marketplace
            result = result.filter(tour => !this.isPurchased(tour._id));
            
            if (this.selectedTags.length > 0) {
                result = result.filter(tour => {
                    if (!tour.tags || tour.tags.length === 0) return false;
                    // Controlla se il tour possiede TUTTI i tag selezionati (condizione AND)
                    return this.selectedTags.every(tag => tour.tags.includes(tag));
                });
            }

            if (!this.searchQuery || this.searchQuery.trim() === '') {
                return result;
            }
            
            const query = this.searchQuery.toLowerCase().trim();
            return result.filter(tour => {
                const name = tour.name?.toLowerCase() || '';
                const museum = tour.museum_id?.museum?.toLowerCase() || '';
                const description = tour.description?.toLowerCase() || '';
                return name.includes(query) || museum.includes(query) || description.includes(query);
            });
        },
        toggleTag(tag) {
            if (tag === 'Tutti') {
                this.selectedTags = [];
                return;
            }
            
            const index = this.selectedTags.indexOf(tag);
            if (index > -1) {
                this.selectedTags.splice(index, 1);
            } else {
                this.selectedTags.push(tag);
            }
        },
        async init() {
            // Load dark mode preference
            const savedDarkMode = localStorage.getItem('artaround_darkmode');
            this.darkMode = savedDarkMode === 'true';

            const savedCart = localStorage.getItem('artaround_cart');
            if (savedCart) {
                try {
                    this.cart = JSON.parse(savedCart);
                } catch (e) {
                    console.error('Errore parsing carrello salvato', e);
                }
            }

            // Watch for dark mode changes
            this.$watch('darkMode', (value) => {
                localStorage.setItem('artaround_darkmode', value);
            });
            
            // Set active sidebar link
            setTimeout(() => {
                const path = window.location.pathname;
                document.querySelectorAll('.nav-link-admin, .mobile-nav-item').forEach(link => {
                    const href = link.getAttribute('href');
                    if (!href || href.startsWith('#')) return; // ignore offcanvas toggles

                    let isActive = href === path || (path === '/editor/' && href === '/editor/dashboard');
                    
                    if (path.startsWith('/editor-marketplace/') && (href === 'index.html' || href === './' || href === '/editor-marketplace/')) {
                        isActive = true;
                    }

                    if (isActive) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }, 100);

            const promises = [this.checkAuth(), this.fetchTours()];
            
            // Check cache to immediately decide if we should load admin stats in parallel
            const savedUserDataStr = localStorage.getItem('artaround_user_data');
            let cachedAdmin = false;
            if (savedUserDataStr) {
                try {
                    const savedUserData = JSON.parse(savedUserDataStr);
                    cachedAdmin = (savedUserData.permissions === 'admin');
                } catch(e) {}
            }
            if (cachedAdmin) {
                promises.push(this.refreshStats());
            }

            await Promise.all(promises);

            this.isLoading = false;
            
            // Fallback in case cache was wrong or empty, but auth yielded admin
            if (this.permissions === 'admin' && !cachedAdmin) {
                this.refreshStats();
            }

            const activePin = sessionStorage.getItem('activeRoomPin');
            if (activePin) {
                this.roomState.pin = activePin;
                this.roomState.visitId = sessionStorage.getItem('activeRoomVisitId');
                this.roomState.students = [];
                this.isLobbyModalOpen = true;

                if (this.roomState.eventSource) {
                    this.roomState.eventSource.close();
                }
                this.roomState.eventSource = new EventSource(`/api/rooms/events/${activePin}`);
                
                this.roomState.eventSource.addEventListener('student-joined', (e) => {
                    const eventData = JSON.parse(e.data);
                    this.roomState.students = eventData.students;
                });
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

                if (savedUsername) {
                    this.username = savedUsername;
                    this.isLoggedIn = true;
                }
                
                // CACHE LOCALE (per rendering istantaneo)
                const savedUserDataStr = localStorage.getItem('artaround_user_data');
                if (savedUserDataStr) {
                    try {
                        const savedUserData = JSON.parse(savedUserDataStr);
                        this.permissions = savedUserData.permissions || '';
                        this.propic = savedUserData.propic || '';
                        if (this.purchasedVisits !== undefined) {
                            this.purchasedVisits = savedUserData.purchased_visits || [];
                        }
                    } catch (e) {
                        console.error('Error parsing saved user data', e);
                    }
                }

                // VALIDAZIONE IN BACKGROUND
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
                    this.propic = data.user?.propic || '';
                    if (this.purchasedVisits !== undefined) {
                        this.purchasedVisits = data.user?.purchased_visits || [];
                    }
                    this.isLoggedIn = true;
                    // AGGIORNA LA CACHE
                    localStorage.setItem('artaround_user_data', JSON.stringify(data.user));
                } else {
                    if (typeof this.logout === 'function') {
                        this.logout();
                    } else {
                        localStorage.removeItem('artaround_token');
                        localStorage.removeItem('artaround_user');
                        localStorage.removeItem('artaround_user_data');
                        this.isLoggedIn = false;
                    }
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
                const isDashboard = window.location.pathname.includes('/editor/dashboard');
                const url = isDashboard ? '/api/visite?manage=true' : '/api/visite';
                const response = await fetch(url, {
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

        saveCart() {
            localStorage.setItem('artaround_cart', JSON.stringify(this.cart));
        },

        addToCart(tour) {
            if (!this.isInCart(tour._id)) {
                this.cart.push(tour);
                this.saveCart();
                this.showToast('Tour aggiunto al carrello!', 'success');
            } else {
                this.showToast('Il tour è già nel carrello!', 'warning');
            }
        },

        removeFromCart(tourId) {
            this.cart = this.cart.filter(item => item._id !== tourId);
            this.saveCart();
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
                    this.saveCart();
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

        validateUsername(val) {
            if (val.length < 5) return "L'username deve avere almeno 5 caratteri.";
            if (/\s/.test(val)) return "Gli spazi non sono consentiti. Usa '_' o '.'.";
            if (!/^[a-zA-Z0-9_.]+$/.test(val)) return "Caratteri non validi. Usa solo lettere, numeri, '_' e '.'.";
            return "";
        },

        async updateProfile() {
            this.profileForm.nameError = this.validateUsername(this.profileForm.name);
            if (this.profileForm.nameError) return;

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
                    if (err.error === 'Nome utente già in uso' || err.error?.toLowerCase().includes('in uso')) {
                        this.profileForm.nameError = err.error;
                    } else {
                        this.showToast(err.error || 'Errore aggiornamento profilo', 'error');
                    }
                }
            } catch (error) {
                console.error("Errore aggiornamento profilo:", error);
                this.showToast('Errore di connessione', 'error');
            }
        },

        async uploadProfileImage(event) {
            // grab the first file selected by the user
            const file = event.target.files[0];
            if (!file) return;

            // basic validation: we only accept images
            if (!file.type.startsWith('image/')) {
                this.showToast('Per favore seleziona un\'immagine', 'error');
                return;
            }

            // check file size: max 2MB (2 * 1024 * 1024 bytes)
            if (file.size > 2 * 1024 * 1024) {
                this.showToast('L\'immagine non deve superare i 2MB', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('image', file);

            try {
                // send the file to our backend upload route
                const token = localStorage.getItem('artaround_token');
                const response = await fetch('/api/upload/user', {
                    method: 'POST',
                    headers: { 'Authorization': token },
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    this.profileForm.propic = data.url;
                } else {
                    const err = await response.json();
                    this.showToast(err.error || 'Errore durante il caricamento', 'error');
                }
            } catch (error) {
                console.error("Errore upload:", error);
                this.showToast('Errore durante il caricamento', 'error');
            }
        },

        toasts: [],
        handleToastEvent(e) {
            // we use the current timestamp as a unique id for each toast
            const id = Date.now();
            this.toasts.push({ id, message: e.detail.message, type: e.detail.type });
            
            // keep maximum 3 toasts on screen so it doesn't get spammy
            // shift() removes the oldest one from the start of the array
            if (this.toasts.length > 3) {
                this.toasts.shift();
            }
            
            // auto-remove the toast after 4 seconds
            setTimeout(() => {
                this.toasts = this.toasts.filter(t => t.id !== id);
            }, 4000);
        },
        showToast(message, type) {
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
                    this.roomState.visitId = visitId;
                    this.roomState.students = [];
                    this.isVisitSelectionModalOpen = false;
                    this.isLobbyModalOpen = true;

                    sessionStorage.setItem('activeRoomPin', data.pin);
                    sessionStorage.setItem('activeRoomVisitId', visitId);

                    if (this.roomState.eventSource) {
                        this.roomState.eventSource.close();
                    }
                    this.roomState.eventSource = new EventSource(`/api/rooms/events/${data.pin}`);
                    
                    this.roomState.eventSource.addEventListener('student-joined', (e) => {
                        const eventData = JSON.parse(e.data);
                        this.roomState.students = eventData.students;
                    });
                } else {
                    const err = await response.json();
                    this.showToast(err.error || 'Errore creazione stanza', 'error');
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
                    sessionStorage.removeItem('activeRoomPin');
                    sessionStorage.removeItem('activeRoomVisitId');
                    const teacherLink = `/navigator/visit/${this.roomState.visitId}?role=teacher&pin=${this.roomState.pin}`;
                    window.location.href = teacherLink;
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
            sessionStorage.removeItem('activeRoomPin');
            sessionStorage.removeItem('activeRoomVisitId');
        }
    };
}
