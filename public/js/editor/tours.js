document.addEventListener('alpine:init', () => {
    Alpine.data('toursManager', () => ({
        isReady: false,
        isLoaded: false,
        isLoggedIn: false,
        permissions: '',
        propic: '',
        username: '',
        step: 'marketplace',
        mode: null,
        formTab: 'info',

        roomState: { pin: null, students: [], eventSource: null },
        isLobbyModalOpen: false,
        visibilityFilter: 'all',
        predefinedTags: ['Arte', 'Storia', 'Scienza', 'Natura', 'Tecnologia'],

        newCustomTag: '',
        get customTags() {
            return this.tour.tags ? this.tour.tags.filter(t => !this.predefinedTags.includes(t)) : [];
        },

        museums: [],
        availableTours: [],
        selectedMuseum: '',
        museumSearch: '',
        selectedCity: '',
        selectedTourId: '',

        tour: {
            _id: '',
            name: '',
            description: '',
            image: '',
            museum_id: '',
            items: [],
            logistic_info: [],
            pre_visit: [],
            tags: [],
            mnemonicCode: '',
            isPrivate: false,
            prezzo: 0
        },

        availableArtworks: [],
        selectedArtworks: [],
        artworkSearch: '',
        tourSearch: '',
        mobileArtworksTab: 'selected',
        mobileQuizTab: 'list',

        quizQuestions: [],
        newQuestion: { question: '', options: ['', ''], correctIndex: 0 },
        editingQuestionId: null,

        activeTourPiano: 0,
        get currentTourMuseum() {
            if (!this.tour || !this.tour.museum_id) return null;
            const museumId = typeof this.tour.museum_id === 'object' ? this.tour.museum_id._id : this.tour.museum_id;
            const m = this.museums.find(x => String(x._id) === String(museumId));
            if (!m) return null;
            const mappa = (typeof MapUtils !== 'undefined') ? MapUtils.normalizeMappaData(m) : m.mappa;
            return {
                ...m,
                mappa
            };
        },

        notification: {
            show: false,
            message: '',
            type: 'success'
        },

        activeRoomsMap: {},
        isRoomActive(visitId) {
            if (!this.activeRoomsMap || !this.activeRoomsMap[visitId]) return false;
            const room = this.activeRoomsMap[visitId];
            return !room.teacherId || room.teacherId === this.username || this.permissions === 'admin';
        },
        getActiveRoomOwner(visitId) {
            if (!this.activeRoomsMap || !this.activeRoomsMap[visitId]) return null;
            return this.activeRoomsMap[visitId].teacherId || null;
        },
        async fetchActiveRooms() {
            try {
                const url = this.username ? `/api/rooms/active?teacherId=${encodeURIComponent(this.username)}` : '/api/rooms/active';
                const res = await fetch(url);
                if (res.ok) {
                    this.activeRoomsMap = await res.json();
                }
            } catch (e) {}
        },

        addCustomTag() {
            const tag = this.newCustomTag.trim();
            if (tag) {
                const formattedTag = tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
                if (!this.tour.tags) this.tour.tags = [];
                if (!this.tour.tags.includes(formattedTag)) {
                    this.tour.tags.push(formattedTag);
                }
                this.newCustomTag = '';
            }
        },

        removeTag(tagToRemove) {
            if (this.tour.tags) {
                this.tour.tags = this.tour.tags.filter(t => t !== tagToRemove);
            }
        },

        async init() {
            this._restoringState = true;
            this.isLoaded = false;

            await this.checkAuth();
            if (this.isLoggedIn) {
                await Promise.all([
                    this.fetchMuseums(),
                    this.fetchAllTours()
                ]);
                
                const urlParams = new URLSearchParams(window.location.search);
                const editId = urlParams.get('id');
                const modeParam = urlParams.get('mode');

                // Se arriviamo da un link diretto con id o con mode=create, scavalchiamo lo stato salvato nel localStorage
                if (editId) {
                    this.mode = 'edit';
                    this.selectedTourId = editId;
                    const success = await this.loadTour(editId);
                    if (success) {
                        this.selectedMuseum = this.tour.museum_id;
                        await this.fetchAvailableArtworks();
                        this.step = 'form';
                        this.formTab = 'info';
                    } else {
                        this.resetToSelection();
                    }
                } else if (modeParam === 'create') {
                    localStorage.removeItem('artaround_tours_state');
                    this.mode = 'create';
                    this.selectedTourId = '';
                    this.selectedMuseum = '';
                    this.step = 'marketplace';
                    this.formTab = 'info';
                    this.tour = {
                        _id: '',
                        name: '',
                        description: '',
                        image: '',
                        museum_id: '',
                        items: [],
                        logistic_info: [],
                        pre_visit: [],
                        tags: [],
                        mnemonicCode: '',
                        isPrivate: false
                    };
                } else {
                    localStorage.removeItem('artaround_tours_state');
                    this.selectedMuseum = '';
                    this.step = 'marketplace';
                }

                // Attiviamo i watcher solo a ripristino completato per evitare salvataggi intermedi errati
                this._restoringState = false;

                this.$watch('step', () => this._saveNavState());
                this.$watch('selectedMuseum', () => this._saveNavState());
                this.$watch('selectedTourId', () => this._saveNavState());
                this.$watch('mode', () => this._saveNavState());
                this.$watch('formTab', () => this._saveNavState());
            } else {
                this.logout();
                return;
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

            this.isLoaded = true;
            this.isReady = true;
        },

        resetToSelection() {
            this.step = 'marketplace';
            this.mode = null;
            this.selectedMuseum = '';
            this.selectedTourId = '';
            localStorage.removeItem('artaround_tours_state');
        },

        _saveNavState() {
            if (this._restoringState) return;
            if (this.step === 'selection') {
                localStorage.removeItem('artaround_tours_state');
                return;
            }
            localStorage.setItem('artaround_tours_state', JSON.stringify({
                step: this.step,
                selectedMuseum: this.selectedMuseum,
                selectedTourId: this.selectedTourId,
                mode: this.mode,
                formTab: this.formTab
            }));
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

        logout() {
            localStorage.removeItem('artaround_token');
            localStorage.removeItem('artaround_user');
            localStorage.removeItem('artaround_tours_state');
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
        async uploadTourImage(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                this.showToast("Seleziona un'immagine", 'error');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                this.showToast("L'immagine non deve superare i 5MB", 'error');
                return;
            }

            const formData = new FormData();
            formData.append('image', file);

            try {
                const res = await fetch('/api/upload/visit', {
                    method: 'POST',
                    headers: { 'Authorization': localStorage.getItem('artaround_token') },
                    body: formData
                });
                if (res.ok) {
                    const data = await res.json();
                    this.tour.image = data.url;
                    this.showToast('Immagine caricata');
                } else {
                    const err = await res.json();
                    this.showToast(err.error || 'Errore durante il caricamento', 'error');
                }
            } catch (e) {
                this.showToast('Errore durante il caricamento', 'error');
            } finally {
                event.target.value = '';   // permette di ricaricare lo stesso file
            }
        },

        // NAVIGATION

        // MUSEUMS
        async fetchMuseums() {
            try {
                const token = localStorage.getItem('artaround_token');
                if (!token) return;
                const res = await fetch('/api/museums', {
                    headers: { 'Authorization': token }
                });
                if (res.ok) {
                    this.museums = await res.json();
                }
            } catch (e) {
                console.error("Errore nel caricamento dei musei:", e);
            }
        },



        get canProceed() {
            return this.selectedMuseum !== '';
        },
        
        setMode(mode) {
            this.mode = mode;
            this.formTab = 'info';
            this.selectedMuseum = '';
            this.selectedTourId = '';
            this.selectedArtworks = [];
            this.artworkSearch = '';
            
            if (mode === 'edit') {
                this.step = 'marketplace';
            } else {
                this.step = 'selection';
                this.$nextTick(() => {
                    const pickerEl = document.getElementById('museum-picker-section');
                    if (pickerEl) {
                        pickerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            }
        },

        async goBackFromForm() {
            this.step = 'marketplace';
            this.selectedTourId = '';
            this.mode = null;
            await this.fetchAllTours();
        },
        proceed() {
            if (!this.canProceed) return;
            this.goToForm();
        },
        
        async editTour(tourId) {
            this.mode = 'edit';
            this.selectedTourId = tourId;
            await this.goToForm();
        },

        async goToForm() {
            if (this.mode === 'create') {
                this.tour = {
                    _id: '',
                    name: '',
                    description: '',
                    image: '',
                    museum_id: this.selectedMuseum,
                    items: [],
                    logistic_info: [],
                    pre_visit: [],
                    tags: [],
                    mnemonicCode: '',
                    isPrivate: false
                };
            } else if (this.mode === 'edit' && this.selectedTourId) {
                const success = await this.loadTour(this.selectedTourId);
                if (!success) {
                    this.step = 'marketplace';
                    return;
                }
            }
            await this.fetchAvailableArtworks();
            this.step = 'form';
        },

        createNewTour() {
            if (!this.selectedMuseum) {
                this.showToast("Seleziona prima un museo dal menu a tendina per creare una visita", "error");
                return;
            }
            this.tour = {
                _id: '',
                name: '',
                description: '',
                image: '',
                museum_id: this.selectedMuseum,
                items: [],
                logistic_info: [],
                pre_visit: [],
                tags: [],
                mnemonicCode: '',
                isPrivate: false,
                prezzo: 0
            };
            this.selectedTourId = '';
            this.selectedArtworks = [];
            this.step = 'form';
            this.formTab = 'info';
        },

        async fetchAllTours() {
            try {
                const token = localStorage.getItem('artaround_token');
                if (!token) return;
                const res = await fetch('/api/visite?manage=true', {
                    headers: { 'Authorization': token }
                });
                if (res.ok) {
                    this.availableTours = await res.json();
                }
                await this.fetchActiveRooms();
            } catch (e) {
                console.error("Errore nel caricamento delle visite:", e);
            }
        },

        async loadTour(tourId) {
            try {
                const res = await fetch(`/api/visite/${tourId}`, {
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });
                if (res.ok) {
                    const tourData = await res.json();
                    const museumId = tourData.museum_id ? (typeof tourData.museum_id === 'object' ? tourData.museum_id._id : tourData.museum_id) : '';

                    // Riassegniamo l'intero oggetto tour per far rilevare il cambio ad Alpine ed aggiornare i campi del form
                    this.tour = {
                        _id: tourData._id || '',
                        name: tourData.name || '',
                        description: tourData.description || '',
                        image: tourData.image || '',
                        museum_id: museumId,
                        items: tourData.items || [],
                        logistic_info: tourData.logistic_info || [],
                        pre_visit: tourData.pre_visit || [],
                        tags: tourData.tags || [],
                        mnemonicCode: tourData.mnemonicCode || '',
                        isPrivate: tourData.isPrivate || false,
                        prezzo: tourData.prezzo || 0
                    };

                    await this.fetchTourArtworks();
                    await this.fetchQuizQuestions();
                    return true;
                } else {
                    let errMsg = "Errore nel caricamento della visita";
                    try {
                        const errData = await res.json();
                        errMsg = errData.error || errMsg;
                    } catch (e) {}
                    this.showToast(errMsg, "error");
                    return false;
                }
            } catch (e) {
                console.error("loadTour error:", e);
                this.showToast("Errore di connessione o formato dati", "error");
                return false;
            }
        },

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
                console.error("loadTour error:", e);
                this.showToast("Errore di connessione o formato dati", "error");
                return false;
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
                    if (this.tour.items && this.tour.items.length > 0 && this.availableArtworks.length > 0) {
                        this.selectedArtworks = this.availableArtworks.filter(a =>
                            this.tour.items.includes(a._id)
                        );
                    } else {
                        this.selectedArtworks = [];
                    }
                }
            } catch (e) {
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

        availableCities() {
            if (!this.museums || !Array.isArray(this.museums)) return [];
            const cities = this.museums
                .map(m => m.city)
                .filter(c => c && c.trim() !== '')
                .map(c => c.trim());
            return [...new Set(cities)].sort();
        },

        filteredMuseums() {
            let list = this.museums || [];
            if (this.selectedCity) {
                list = list.filter(m => m.city && m.city.toLowerCase() === this.selectedCity.toLowerCase());
            }
            if (this.museumSearch) {
                const q = this.museumSearch.toLowerCase();
                list = list.filter(m => 
                    (m.museum && m.museum.toLowerCase().includes(q)) ||
                    (m.city && m.city.toLowerCase().includes(q)) ||
                    (m.address && m.address.toLowerCase().includes(q)) ||
                    (m.region && m.region.toLowerCase().includes(q))
                );
            }
            return list;
        },

        get filteredTours() {
            if (!this.selectedMuseum) return [];

            let tours = this.availableTours;
            tours = tours.filter(t => {
                if (!t.museum_id) return false;
                const museumId = typeof t.museum_id === 'object' ? t.museum_id._id : t.museum_id;
                return museumId.toString() === this.selectedMuseum.toString();
            });

            if (this.visibilityFilter === 'public') {
                tours = tours.filter(t => !t.isPrivate);
            } else if (this.visibilityFilter === 'private') {
                tours = tours.filter(t => t.isPrivate);
            }

            if (this.tourSearch) {
                tours = tours.filter(t => t.name.toLowerCase().includes(this.tourSearch.toLowerCase()));
            }
            return tours.reverse();
        },

        addArtworkToTour(artwork) {
            if (!artwork) return;

            if (this.selectedArtworks.some(a => a._id === artwork._id)) {
                this.showToast("Opera già selezionata", "error");
                return;
            }

            this.selectedArtworks.push(artwork);
            this.showToast("Opera aggiunta alla visita!");
        },

        removeArtworkFromTour(artworkId) {
            this.selectedArtworks = this.selectedArtworks.filter(a => a._id !== artworkId);
            this.showToast("Opera rimossa dalla visita!");
        },

        moveArtworkUp(index) {
            if (index === 0) return;
            const temp = this.selectedArtworks[index];
            this.selectedArtworks[index] = this.selectedArtworks[index - 1];
            this.selectedArtworks[index - 1] = temp;
        },

        moveArtworkDown(index) {
            if (index === this.selectedArtworks.length - 1) return;
            const temp = this.selectedArtworks[index];
            this.selectedArtworks[index] = this.selectedArtworks[index + 1];
            this.selectedArtworks[index + 1] = temp;
        },

        async saveTour() {
            if (!this.tour.name) {
                this.showToast("Inserisci il nome della visita", "error");
                return;
            }

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
                        image: this.tour.image,
                        museum_id: this.tour.museum_id,
                        items: items,
                        logistic_info: this.tour.logistic_info,
                        tags: this.tour.tags,
                        mnemonicCode: this.tour.mnemonicCode,
                        isPrivate: this.tour.isPrivate,
                        prezzo: Number(this.tour.prezzo) || 0
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (!isEdit) {
                        this.tour._id = data.visit._id;
                        this.quizQuestions = [];
                    }
                    await this.fetchAllTours();
                    this.showToast(isEdit ? "Visita aggiornata con successo!" : "Visita creata con successo!");
                } else {
                    const err = await res.json();
                    this.showToast(err.error || "Errore nel salvataggio", "error");
                }
            } catch (e) {
                console.error("loadTour error:", e);
                this.showToast("Errore di connessione o formato dati", "error");
                return false;
            }
        },

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
                console.error("loadTour error:", e);
                this.showToast("Errore di connessione o formato dati", "error");
                return false;
            }
        },

        async deleteTourFromList(tourId) {
            if (!confirm("Sei sicuro di voler eliminare questa visita?")) return;

            try {
                const res = await fetch(`/api/visite/${tourId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });

                if (res.ok) {
                    this.showToast("Visita eliminata con successo!");
                    await this.fetchAllTours();
                    this.selectedTourId = '';
            this.selectedArtworks = [];
                } else {
                    this.showToast("Errore nell'eliminazione", "error");
                }
            } catch (e) {
                console.error("loadTour error:", e);
                this.showToast("Errore di connessione o formato dati", "error");
                return false;
            }
        },

        async fetchQuizQuestions() {
            if (!this.tour._id) return;
            try {
                const res = await fetch(`/api/visite/${this.tour._id}/quiz`);
                if (res.ok) {
                    this.quizQuestions = await res.json();
                }
            } catch (e) {
                this.showToast("Errore nel caricamento del quiz", "error");
            }
        },

        addOption() {
            if (this.newQuestion.options.length >= 6) return;
            this.newQuestion.options.push('');
        },

        removeOption(index) {
            if (this.newQuestion.options.length <= 2) return;
            this.newQuestion.options.splice(index, 1);
            if (this.newQuestion.correctIndex >= this.newQuestion.options.length) {
                this.newQuestion.correctIndex = 0;
            }
        },

        startEditQuestion(q) {
            this.editingQuestionId = q._id;
            this.newQuestion = {
                question: q.question,
                options: [...q.options],
                correctIndex: q.correctIndex
            };
        },

        cancelEditQuestion() {
            this.editingQuestionId = null;
            this.newQuestion = { question: '', options: ['', ''], correctIndex: 0 };
        },

        async saveQuizQuestion() {
            if (!this.newQuestion.question.trim()) {
                this.showToast("Inserisci il testo della domanda", "error");
                return;
            }
            const filledOptions = this.newQuestion.options.map(o => o.trim()).filter(o => o !== '');
            if (filledOptions.length < 2) {
                this.showToast("Servono almeno 2 opzioni compilate", "error");
                return;
            }
            if (this.newQuestion.correctIndex >= filledOptions.length) {
                this.showToast("Seleziona quale opzione è corretta", "error");
                return;
            }

            const isEdit = !!this.editingQuestionId;
            const url = isEdit
                ? `/api/visite/${this.tour._id}/quiz/${this.editingQuestionId}`
                : `/api/visite/${this.tour._id}/quiz`;
            const method = isEdit ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': localStorage.getItem('artaround_token')
                    },
                    body: JSON.stringify({
                        question: this.newQuestion.question.trim(),
                        options: filledOptions,
                        correctIndex: this.newQuestion.correctIndex,
                        order: this.quizQuestions.length
                    })
                });

                if (res.ok) {
                    this.showToast(isEdit ? "Domanda aggiornata!" : "Domanda aggiunta!");
                    this.cancelEditQuestion();
                    await this.fetchQuizQuestions();
                } else {
                    const err = await res.json();
                    this.showToast(err.error || "Errore nel salvataggio della domanda", "error");
                }
            } catch (e) {
                console.error("loadTour error:", e);
                this.showToast("Errore di connessione o formato dati", "error");
                return false;
            }
        },

        async deleteQuizQuestion(questionId) {
            if (!confirm("Eliminare questa domanda?")) return;
            try {
                const res = await fetch(`/api/visite/${this.tour._id}/quiz/${questionId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });
                if (res.ok) {
                    this.showToast("Domanda eliminata");
                    await this.fetchQuizQuestions();
                } else {
                    this.showToast("Errore nell'eliminazione", "error");
                }
            } catch (e) {
                console.error("loadTour error:", e);
                this.showToast("Errore di connessione o formato dati", "error");
                return false;
            }
        },

        async createRoom(visitId) {
            try {
                const response = await fetch('/api/rooms/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ visitId, teacherId: this.username, allowLateJoins: this.allowLateJoins })
                });

                if (response.ok) {
                    const data = await response.json();
                    await this.fetchActiveRooms();

                    if (data.isStarted) {
                        const teacherLink = `/navigator/visit/${visitId}?role=teacher&pin=${data.pin}&index=${data.currentArtworkIndex || 0}`;
                        window.location.href = teacherLink;
                        return;
                    }

                    this.roomState.pin = data.pin;
                    this.roomState.visitId = visitId;
                    this.roomState.students = [];
                    this.isLobbyModalOpen = true;
                    
                    sessionStorage.setItem('activeRoomPin', data.pin);
                    sessionStorage.setItem('activeRoomVisitId', visitId);

                    if (this.roomState.eventSource) {
                        this.roomState.eventSource.close();
                    }
                    this.roomState.eventSource = new EventSource(`/api/rooms/events/${data.pin}`);
                    
                    this.roomState.eventSource.addEventListener('connected', (e) => {
                        const eventData = JSON.parse(e.data);
                        this.roomState.students = eventData.students || [];
                    });

                    this.roomState.eventSource.addEventListener('student-joined', (e) => {
                        const eventData = JSON.parse(e.data);
                        this.roomState.students = eventData.students;
                    });
                } else {
                    let errMsg = 'Errore creazione stanza';
                    try {
                        const err = await response.json();
                        errMsg = err.error || errMsg;
                    } catch (e) {}
                    this.showToast(errMsg, 'error');
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

        async closeLobby() {
            this.isLobbyModalOpen = false;
            if (this.roomState.pin) {
                try {
                    await fetch('/api/rooms/end', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pin: this.roomState.pin, visitId: this.roomState.visitId })
                    });
                } catch (e) {}
            }
            if (this.roomState.eventSource) {
                this.roomState.eventSource.close();
                this.roomState.eventSource = null;
            }
            this.roomState.pin = null;
            sessionStorage.removeItem('activeRoomPin');
            sessionStorage.removeItem('activeRoomVisitId');
            await this.fetchActiveRooms();
        }
    }));
});