function artworkManager() {
    return {
        // UI STATE
        isReady: false,
        isLoggedIn: false,
        permissions: '',
        propic: '',
        username: '',
        step: 'artwork-museum-select', // initial state: museum selection

        // DATA
        museums: [],
        artworks: [],
        selectedMuseumId: '',
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
                        if (this.hasOwnProperty('purchasedVisits')) {
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
                    if (this.hasOwnProperty('purchasedVisits')) {
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

        // MUSEUM LOGIC (For Select)
        async fetchMuseums() {
            // load available museums for dropdown
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

        getMuseumName(id) {
            // get museum name by ID
            const m = this.museums.find(museo => museo._id === id);
            return m ? m.museum : 'Selezionato';
        },

        // ARTWORK LOGIC
        async fetchArtworks() {
            // load artworks for selected museum
            if (!this.selectedMuseumId) return;

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
                    this.showToast(err.error || "Errore nel salvataggio", "error");
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
