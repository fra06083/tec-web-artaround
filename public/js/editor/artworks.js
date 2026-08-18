function artworkManager() {
    return {
        // UI STATE
        isReady: false,
        isLoggedIn: false,
        isLoaded: false,
        isLoadingArtworks: false,
        permissions: '',
        propic: '',
        username: '',
        step: 'artwork-museum-select', // initial state: museum selection

        // DATA
        museums: [],
        artworks: [],
        selectedMuseumId: '',
        artworkSearch: '',

        museumSearch: '',
        selectedCity: '',

        availableCities() {
            if (!this.museums || !Array.isArray(this.museums)) return [];
            const cities = this.museums
                .map(m => m.city)
                .filter(c => c && c.trim() !== '')
                .map(c => c.trim());
            return [...new Set(cities)].sort();
        },

        filteredMuseumList() {
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

        filteredArtworks() {
            const q = (this.artworkSearch || '').toLowerCase();
            if (!q) return this.artworks;
            return this.artworks.filter(a => 
                (a.item && a.item.toLowerCase().includes(q)) ||
                (a.author && a.author.toLowerCase().includes(q)) ||
                (a.description && a.description.toLowerCase().includes(q)) ||
                (a.sala && a.sala.nome && a.sala.nome.toLowerCase().includes(q))
            );
        },

        getSalaName(art) {
            if (!art || !art.sala || art.sala === false) return '';
            let name = '';
            if (typeof art.sala === 'string') {
                name = art.sala;
            } else if (typeof art.sala === 'object' && art.sala !== null) {
                name = art.sala.nome || art.sala.name || art.sala.title || '';
            }
            if (typeof name !== 'string') {
                name = String(name || '');
            }
            name = name.trim();
            const check = name.toLowerCase();
            if (!check || check === 'null' || check === 'undefined' || check === 'false' || check === '0' || check === '—' || check === '-') {
                return '';
            }
            return name;
        },

        hasSala(art) {
            const val = this.getSalaName(art);
            return typeof val === 'string' && val.length > 0;
        },

        activeDescType: 'medio',
        activeDescLength: '15s',
        descriptions: { 
            infantile: { '3s': '', '15s': '', '40s': '' }, 
            semplice: { '3s': '', '15s': '', '40s': '' }, 
            medio: { '3s': '', '15s': '', '40s': '' }, 
            dettagliato: { '3s': '', '15s': '', '40s': '' } 
        },

        // CURRENT ARTWORK OBJECT (For Form)
        currentArtwork: {
            item: '',
            img_path: '',
            museum_id: '',
            author: '',
            license: '',
            sala: { nome: '', piano: 0 },

            // remove maybe
            description: '',
            desc_type: 'medio' // default
        },

        // NOTIFICATION
        notification: {
            show: false,
            message: '',
            type: 'success' // 'success' or 'error'
        },

        // INITIALIZATION
        async init() {
            if (typeof this.$watch === 'function') {
                this.$watch('step', (val) => {
                    console.log('step:', val, 'selectedMuseumId:', this.selectedMuseumId);
                    if (val === 'artwork-museum-select') {
                        this.selectedMuseumId = '';
                        this.artworks = [];
                    } else if (val === 'artwork-list' && (!this.selectedMuseumId || this.selectedMuseumId.trim() === '')) {
                        this.step = 'artwork-museum-select';
                    }
                });
                this.$watch('selectedMuseumId', (val) => {
                    console.log('step:', this.step, 'selectedMuseumId:', val);
                    if (!val || val.trim() === '') {
                        this.selectedMuseumId = '';
                        this.artworks = [];
                        if (this.step === 'artwork-list') {
                            this.step = 'artwork-museum-select';
                        }
                    }
                });
            }
            await this.checkAuth();
            if (this.isLoggedIn) {
                await this.fetchMuseums();
                this.isLoaded = true;
            } else {
                this.logout();
            }
            this.isReady = true;
        },

        // AUTHENTICATION
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

        logout() {
            // clear session and redirect to login
            localStorage.removeItem('artaround_token');
            localStorage.removeItem('artaround_user');
            window.location.href = '/login.html';
        },

        showToast(msg, type = 'success') {
            // display notification message
            this.notification.message = msg;
            this.notification.type = type;
            this.notification.show = true;
            setTimeout(() => {
                this.notification.show = false;
            }, 3000);
        },

        async fetchMuseums() {
            // load available museums for dropdown
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
                console.error('Errore durante il recupero dei musei:', e);
            }
        },

        getMuseumName(id) {
            // get museum name by ID
            const m = this.museums.find(museo => museo._id === id);
            return m ? m.museum : 'Selezionato';
        },

        // Piani del museo selezionato, per la select della sala
        getPianiMuseo() {
            const m = this.museums.find(mu => mu._id === this.currentArtwork.museum_id);
            return [...(m?.mappa?.piante || [])].sort((a, b) => a.piano - b.piano);
        },

        // Solo i punti di tipo 'sala': bagni e bar non contengono opere
        getSaleMuseo() {
            const m = this.museums.find(mu => mu._id === this.currentArtwork.museum_id);
            const sale = (m?.mappa?.sale || []).filter(s => s.tipo === 'sala');
            return [...sale].sort((a, b) =>
                (a.piano - b.piano) || (a.nome || '').localeCompare(b.nome || '')
            );
        },

        nomePiano(piano) {
            const p = this.getPianiMuseo().find(x => x.piano === piano);
            return p?.nome || ('Piano ' + piano);
        },

        // La sala salvata non esiste (più) tra quelle in mappa
        get salaFuoriMappa() {
            const nome = this.currentArtwork.sala?.nome;
            if (!nome) return false;
            return !this.getSaleMuseo().some(s => s.nome === nome);
        },

        // Scegliendo la sala si compila anche il piano
        aggiornaSala(nome) {
            if (!this.currentArtwork.sala) this.currentArtwork.sala = { nome: '', piano: null };
            this.currentArtwork.sala.nome = nome || '';
            if (!nome) {
                this.currentArtwork.sala.piano = null;
                return;
            }
            const s = this.getSaleMuseo().find(x => x.nome === nome);
            if (s) this.currentArtwork.sala.piano = s.piano;
        },

        // ARTWORK LOGIC
        async fetchArtworks() {
            // load artworks for selected museum
            if (!this.selectedMuseumId) {
                this.artworks = [];
                this.step = 'artwork-museum-select';
                return;
            }

            this.isLoadingArtworks = true;
            try {
                const res = await fetch(`/api/artworks/museum/${this.selectedMuseumId}`, {
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });

                if (res.ok) {
                    this.artworks = await res.json();
                    this.step = 'artwork-list'; // show table once loaded
                } else {
                    this.showToast("Impossibile caricare le opere", "error");
                }
            } catch (e) {
                this.showToast("Errore di connessione", "error");
            }
            this.isLoadingArtworks = false;
        },

        async openArtworkForm(artwork = null) {
            this.descriptions = { 
                infantile: { '3s': '', '15s': '', '40s': '' }, 
                semplice: { '3s': '', '15s': '', '40s': '' }, 
                medio: { '3s': '', '15s': '', '40s': '' }, 
                dettagliato: { '3s': '', '15s': '', '40s': '' } 
            };
            this.activeDescType = 'medio';
            this.activeDescLength = '15s';

            // open form for new or existing artwork
            if (artwork) {
                // copy existing artwork data for editing
                this.currentArtwork = {
                    _id: artwork._id,
                    item: artwork.item || '',
                    img_path: artwork.img_path || '',
                    museum_id: artwork.museum_id || this.selectedMuseumId,
                    author: artwork.author || '',
                    license: artwork.license || '',
                    sala: { nome: artwork.sala?.nome || '', piano: artwork.sala?.piano ?? null },
                    description: artwork.description || '',
                    desc_type: artwork.desc_type || 'medio'
                };
                try {
                    const res = await fetch(`/api/artworks/${artwork._id}/descriptions`, { headers: { Authorization: localStorage.getItem('artaround_token') } });
                    const descs = await res.json();
                    descs.forEach(d => {
                        if (this.descriptions[d.type] && this.descriptions[d.type][d.length] !== undefined) {
                            this.descriptions[d.type][d.length] = d.text;
                        }
                    });
                } catch(e) { console.error(e); }
            } else {
                // reset fields for new artwork
                this.currentArtwork = {
                    item: '',
                    img_path: '',
                    museum_id: this.selectedMuseumId,
                    author: '',
                    license: '',
                    sala: { nome: '', piano: null },
                    description: '',
                    desc_type: 'medio'
                };
            }
            this.step = 'artwork-form';
        },

        async saveArtwork() {

            // create or update artwork
            // validation
            if (!this.currentArtwork.item || !this.currentArtwork.img_path ||
                !this.currentArtwork.museum_id || !this.currentArtwork.author || !this.currentArtwork.license) {
                this.showToast("Compila tutti i campi obbligatori", "error");
                return;
            }
            if (!this.currentArtwork.sala || !this.currentArtwork.sala.nome) {
                this.currentArtwork.sala = { nome: '', piano: null };
            }

            const allDescriptions = [];
            for (const type of Object.keys(this.descriptions)) {
                for (const len of Object.keys(this.descriptions[type])) {
                    const text = this.descriptions[type][len].trim();
                    if (text) {
                        allDescriptions.push({ type, length: len, text });
                    }
                }
            }

            const firstDesc = allDescriptions[0] || { type: 'medio', length: '15s', text: '' };
            const payload = {
                ...this.currentArtwork,
                desc_type: firstDesc.type,
                desc_length: firstDesc.length,
                description: firstDesc.text
            };

            const isEdit = !!this.currentArtwork._id;
            const url = isEdit ? `/api/artworks/${this.currentArtwork._id}` : '/api/artworks';
            const method = isEdit ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('artaround_token') },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                const artworkId = isEdit ? this.currentArtwork._id : data.artwork._id;

                // save remaining description types/lengths
                for (const desc of allDescriptions.slice(1)) {
                    await fetch(`/api/artworks/${artworkId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('artaround_token') },
                        body: JSON.stringify({ ...this.currentArtwork, _id: artworkId, desc_type: desc.type, desc_length: desc.length, description: desc.text })
                    });
                }

                if (res.ok) {
                    this.showToast(isEdit ? "Opera aggiornata con successo!" : "Nuova opera aggiunta!");
                    await this.fetchArtworks(); // reload table
                    this.step = 'artwork-list'; // back to list
                } else {
                    this.showToast(data.error || "Errore nel salvataggio", "error");
                }
            } catch (e) {
                this.showToast("Errore server", "error");
            }
        },

        async deleteArtwork(id) {
            // delete artwork with confirmation
            if (!confirm("Sei sicuro di voler eliminare definitivamente questa opera?")) return;

            try {
                const res = await fetch(`/api/artworks/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });

                if (res.ok) {
                    this.showToast("Opera eliminata con successo");
                    await this.fetchArtworks(); // update table
                } else {
                    this.showToast("Errore nell'eliminazione", "error");
                }
            } catch (e) {
                this.showToast("Errore di connessione", "error");
            }
        },

        async uploadImage(event) {
            const file = event.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('image', file);

            try {
                const token = localStorage.getItem('artaround_token');
                const res = await fetch('/api/upload/artwork', {
                    method: 'POST',
                    headers: { 'Authorization': token },
                    body: formData
                });

                if (res.ok) {
                    const data = await res.json();
                    this.currentArtwork.img_path = data.url;
                    this.showToast('Immagine caricata con successo!', 'success');
                } else {
                    const err = await res.json();
                    this.showToast(err.error || 'Errore caricamento immagine', 'error');
                }
            } catch (error) {
                this.showToast('Errore di connessione durante l\'upload', 'error');
            }
        }
    };
}
