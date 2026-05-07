document.addEventListener('alpine:init', () => {
    Alpine.data('toursManager', () => ({
        // UI STATE
        isReady: false,
        isLoggedIn: false,
        permissions: '',
        username: '',
        step: 'choice', // choice, selection, form
        mode: 'create', // create, edit

        // DATA
        museums: [],
        availableTours: [],
        selectedMuseum: '',
        selectedTourId: '',

        // TOUR DATA
        tour: {
            _id: '',
            name: '',
            description: '',
            museum_id: '',
            items: [], // Array of artwork IDs
            logistic_info: []
        },

        // ARTWORKS MANAGEMENT
        availableArtworks: [], // All artworks for selected museum
        selectedArtworks: [], // Artworks currently selected for the tour (with full data)
        artworkSearch: '', // Search filter for available artworks
        tourSearch: '', // Search filter for tours

        // NOTIFICATIONS
        notification: {
            show: false,
            message: '',
            type: 'success'
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
            localStorage.removeItem('artaround_token');
            localStorage.removeItem('artaround_user');
            window.location.href = '/login.html';
        },

        showToast(msg, type = 'success') {
            this.notification.message = msg;
            this.notification.type = type;
            this.notification.show = true;
            setTimeout(() => {
                this.notification.show = false;
            }, 3000);
        },

        // NAVIGATION
        setMode(mode) {
            this.mode = mode;
            this.step = 'selection';
            this.selectedTourId = '';
            this.selectedArtworks = [];
            this.artworkSearch = '';
        },

        get canProceed() {
            if (this.mode === 'create') {
                return !!this.selectedMuseum;
            }
            return !!this.selectedMuseum && !!this.selectedTourId;
        },

        // MUSEUMS
        async fetchMuseums() {
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

        async onMuseumChange() {
            if (this.mode === 'edit') {
                await this.fetchToursByMuseum();
            }
            // Reset tour data
            this.selectedTourId = '';
        },

        // TOURS
        async fetchToursByMuseum() {
            if (!this.selectedMuseum) return;

            try {
                const res = await fetch('/api/visite', {
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });
                if (res.ok) {
                    const allTours = await res.json();
                    // Fix: museum_id might be an object (when populated) or ObjectId string
                    this.availableTours = allTours.filter(t => {
                        if (!t.museum_id) return false;
                        // If museum_id is an object (populated), get its _id
                        const museumId = typeof t.museum_id === 'object' ? t.museum_id._id : t.museum_id;
                        return museumId.toString() === this.selectedMuseum.toString();
                    });
                }
            } catch (e) {
                this.showToast("Errore nel caricamento delle visite", "error");
            }
        },

        async goToForm() {
            if (this.mode === 'create') {
                // Create new tour
                this.tour = {
                    _id: '',
                    name: '',
                    description: '',
                    museum_id: this.selectedMuseum,
                    items: [],
                    logistic_info: []
                };
                this.selectedArtworks = [];
            } else {
                // Load existing tour
                await this.loadTour(this.selectedTourId);
            }

            // Load artworks for the museum
            await this.fetchAvailableArtworks();

            this.step = 'form';
        },

        async loadTour(tourId) {
            try {
                const res = await fetch(`/api/visite/${tourId}`, {
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });
                if (res.ok) {
                    const tourData = await res.json();
                    // Handle museum_id that might be an object (populated) or ObjectId
                    const museumId = typeof tourData.museum_id === 'object' ? tourData.museum_id._id : tourData.museum_id;

                    this.tour = {
                        _id: tourData._id,
                        name: tourData.name || '',
                        description: tourData.description || '',
                        museum_id: museumId,
                        items: tourData.items || [],
                        logistic_info: tourData.logistic_info || []
                    };

                    // Load artworks in the tour
                    await this.fetchTourArtworks();
                } else {
                    this.showToast("Errore nel caricamento della visita", "error");
                }
            } catch (e) {
                this.showToast("Errore di connessione", "error");
            }
        },

        // ARTWORKS
        async fetchAvailableArtworks() {
            if (!this.tour.museum_id) return;

            try {
                const res = await fetch(`/api/artworks/museum/${this.tour.museum_id}`, {
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });
                if (res.ok) {
                    this.availableArtworks = await res.json();
                } else {
                    this.showToast("Errore nel caricamento delle opere", "error");
                }
            } catch (e) {
                this.showToast("Errore di connessione", "error");
            }
        },

        async fetchTourArtworks() {
            if (!this.tour._id) return;

            try {
                const res = await fetch(`/api/visite/${this.tour._id}/items`, {
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });
                if (res.ok) {
                    this.selectedArtworks = await res.json();
                } else {
                    // Fallback: try to get artworks from tour.items and match with availableArtworks
                    if (this.tour.items && this.tour.items.length > 0 && this.availableArtworks.length > 0) {
                        this.selectedArtworks = this.availableArtworks.filter(a =>
                            this.tour.items.includes(a._id)
                        );
                    } else {
                        this.selectedArtworks = [];
                    }
                }
            } catch (e) {
                // Fallback on error
                if (this.tour.items && this.tour.items.length > 0 && this.availableArtworks.length > 0) {
                    this.selectedArtworks = this.availableArtworks.filter(a =>
                        this.tour.items.includes(a._id)
                    );
                } else {
                    this.selectedArtworks = [];
                }
            }
        },

        get filteredAvailableArtworks() {
            const selectedIds = this.selectedArtworks.map(a => a._id);
            return this.availableArtworks.filter(artwork => {
                const isSelected = selectedIds.includes(artwork._id);
                const matchesSearch = this.artworkSearch === '' ||
                    artwork.item.toLowerCase().includes(this.artworkSearch.toLowerCase()) ||
                    artwork.author.toLowerCase().includes(this.artworkSearch.toLowerCase());
                return !isSelected && matchesSearch;
            });
        },

        get filteredTours() {
            if (!this.tourSearch) {
                // Show all tours, sorted by most recent (newest first)
                return [...this.availableTours].reverse();
            }
            return this.availableTours.filter(t =>
                t.name.toLowerCase().includes(this.tourSearch.toLowerCase())
            );
        },

        // Add artwork locally (no need for tour._id anymore)
        addArtworkToTour(artwork) {
            if (!artwork) return;

            // Check if already selected
            if (this.selectedArtworks.some(a => a._id === artwork._id)) {
                this.showToast("Opera già selezionata", "error");
                return;
            }

            this.selectedArtworks.push(artwork);
            this.showToast("Opera aggiunta alla visita!");
        },

        // Remove artwork locally
        removeArtworkFromTour(artworkId) {
            this.selectedArtworks = this.selectedArtworks.filter(a => a._id !== artworkId);
            this.showToast("Opera rimossa dalla visita!");
        },

        // Move artwork up in the list
        moveArtworkUp(index) {
            if (index === 0) return;
            const temp = this.selectedArtworks[index];
            this.selectedArtworks[index] = this.selectedArtworks[index - 1];
            this.selectedArtworks[index - 1] = temp;
        },

        // Move artwork down in the list
        moveArtworkDown(index) {
            if (index === this.selectedArtworks.length - 1) return;
            const temp = this.selectedArtworks[index];
            this.selectedArtworks[index] = this.selectedArtworks[index + 1];
            this.selectedArtworks[index + 1] = temp;
        },

        // SAVE - Now saves artworks together with the tour
        async saveTour() {
            if (!this.tour.name) {
                this.showToast("Inserisci il nome della visita", "error");
                return;
            }

            // Prepare items array from selected artworks
            const items = this.selectedArtworks.map(a => a._id);

            const isEdit = !!this.tour._id;
            const url = isEdit ? `/api/visite/${this.tour._id}` : '/api/visite';
            const method = isEdit ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': localStorage.getItem('artaround_token')
                    },
                    body: JSON.stringify({
                        name: this.tour.name,
                        description: this.tour.description,
                        museum_id: this.tour.museum_id,
                        items: items, // Include artworks in the save
                        logistic_info: this.tour.logistic_info
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (!isEdit) {
                        this.tour._id = data.visit._id;
                    }
                    this.showToast(isEdit ? "Visita aggiornata con successo!" : "Visita creata con successo!");
                } else {
                    const err = await res.json();
                    this.showToast(err.error || "Errore nel salvataggio", "error");
                }
            } catch (e) {
                this.showToast("Errore di connessione", "error");
            }
        },

        // DELETE
        async deleteTour() {
            if (!this.tour._id) return;

            if (!confirm("Sei sicuro di voler eliminare questa visita?")) return;

            try {
                const res = await fetch(`/api/visite/${this.tour._id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });

                if (res.ok) {
                    this.showToast("Visita eliminata con successo!");
                    this.step = 'choice';
                    this.mode = 'create';
                } else {
                    this.showToast("Errore nell'eliminazione", "error");
                }
            } catch (e) {
                this.showToast("Errore di connessione", "error");
            }
        },

        // DELETE FROM LIST
        async deleteTourFromList(tourId) {
            if (!confirm("Sei sicuro di voler eliminare questa visita?")) return;

            try {
                const res = await fetch(`/api/visite/${tourId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });

                if (res.ok) {
                    this.showToast("Visita eliminata con successo!");
                    await this.fetchToursByMuseum();
                    this.selectedTourId = '';
                } else {
                    this.showToast("Errore nell'eliminazione", "error");
                }
            } catch (e) {
                this.showToast("Errore di connessione", "error");
            }
        }
    }));
});
