const POI_TIPI = [
    { tipo: 'toilette', domanda: 'Dove sono i servizi igienici?' },
    { tipo: 'bar',      domanda: "Dov'è la caffetteria?" },
    { tipo: 'shop',     domanda: "Dov'è il bookshop?" }
];
function museumManager() {
    return {
        // --- STATO SESSIONE & NAVIGAZIONE ---
        isLoggedIn: false,
        username: '',
        permissions: '',
        propic: '',
        step: 'museum-list',
        isReady: false,

        // --- DATI ---
        museums: [],
        selectedMuseumId: '',
        artworks: [],

        // --- OGGETTI PER FORM (Sincronizzati con il Backend) ---
        currentMuseum: {
            museum: '',
            city: '',
            province: '',
            region: '',
            address: '',
            description: '',
            image: ''
        },
        notification: {
            show: false,
            message: '',
            type: 'success' // success o error
        },

        showToast(msg, type = 'success') {
            this.notification.message = msg;
            this.notification.type = type;
            this.notification.show = true;

            // Scompare automaticamente dopo 4 secondi
            setTimeout(() => {
                this.notification.show = false;
            }, 4000);
        },

        // --- AGGIORNA SAVE MUSEUM ---
        async init() {
            await this.checkAuth();
            if (this.isLoggedIn) {
                await this.fetchMuseums();
            } else {
                this.logout();
            }
            this.isReady = true;
        },

        getPageTitle() {
            const titles = {
                'choice': 'Dashboard Catalogo',
                'museum-list': 'Elenco Musei',
                'museum-form': 'Gestione Museo',
                'artwork-museum-select': 'Selezione Museo',
                'artwork-list': 'Catalogo Opere',
                'artwork-form': 'Scheda Opera'
            };
            return titles[this.step] || 'Amministrazione';
        },

        // --- LOGICA MUSEI ---
        async fetchMuseums() {
            try {
                const token = localStorage.getItem('artaround_token');

                const response = await fetch('/api/museums', {
                    method: 'GET', // Anche se è il default, metterlo aiuta a leggere meglio il codice
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token // Fondamentale: senza questo il backend ti darà 401
                    }
                });
                if (response.ok) {
                    this.museums = await response.json();
                } else {
                    // Se il token è scaduto o non valido (401 o 403)
                    if (response.status === 401 || response.status === 403) {
                        this.logout();
                    } else {
                        this.showToast("Impossibile caricare i musei", "error");
                    }
                }
            } catch (e) { console.error("Errore fetch musei:", e); }
        },

        openMuseumForm(museum = null) {
            if (museum) {
                this.currentMuseum = { ...museum };
            } else {
                this.currentMuseum = { museum: '', city: '', province: '', region: '', address: '', description: '', image: '' };
            }
            this.currentMuseum.mappa = this.normalizeMappa(this.currentMuseum);
            this.step = 'museum-form';
        },

        async saveMuseum() {
            const isEdit = !!this.currentMuseum._id;
            const museumName = this.currentMuseum.museum; // Salviamo il nome per la notifica
            const url = isEdit ? `/api/museums/${this.currentMuseum._id}` : '/api/museums';
            const method = isEdit ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': localStorage.getItem('artaround_token')
                    },
                    body: JSON.stringify(this.buildMuseumPayload())
                });

                if (res.ok) {
                    await this.fetchMuseums();
                    this.step = 'museum-list';
                    // NOTIFICA SUCCESSO
                    this.showToast(`Museo "${museumName}" salvato con successo!`, 'success');
                } else {
                    const err = await res.json();
                    // NOTIFICA ERRORE BACKEND
                    this.showToast(err.error || "Impossibile salvare il museo.", 'error');
                }
            } catch (e) {
                this.showToast("Errore di connessione al server.", 'error');
            }
        },

        // Puoi usarlo anche per l'eliminazione!
        async deleteMuseum(id) {
            if (!confirm("Eliminare definitivamente questo museo?")) return;
            try {
                const res = await fetch(`/api/museums/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': localStorage.getItem('artaround_token') }
                });
                if (res.ok) {
                    await this.fetchMuseums();
                    this.showToast("Museo rimosso correttamente.", 'success');
                }
            } catch (e) {
                this.showToast("Errore durante l'eliminazione.", 'error');
            }
        },

        async uploadImage(event) {
            const file = event.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('image', file);

            try {
                const token = localStorage.getItem('artaround_token');
                const res = await fetch('/api/upload/museum', {
                    method: 'POST',
                    headers: { 'Authorization': token },
                    body: formData
                });

                if (res.ok) {
                    const data = await res.json();
                    this.currentMuseum.image = data.url;
                    this.showToast('Immagine caricata con successo!', 'success');
                } else {
                    const err = await res.json();
                    this.showToast(err.error || 'Errore caricamento immagine', 'error');
                }
            } catch (error) {
                this.showToast('Errore di connessione durante l\'upload', 'error');
            }
        },

        // Garantisce che mappa esista e che ci sia una riga per ogni domanda prevista
        normalizeMappa(m) {
            const mappa = m.mappa || {};
            return {
                piante: mappa.piante ? [...mappa.piante] : [],
                poi: POI_TIPI.map(t => {
                    const esistente = (mappa.poi || []).find(p => p.tipo === t.tipo);
                    return { tipo: t.tipo, piano: esistente?.piano ?? 0, testo: esistente?.testo || '' };
                })
            };
        },

        getDomanda(tipo) {
            const t = POI_TIPI.find(x => x.tipo === tipo);
            return t ? t.domanda : tipo;
        },

        addPiano() {
            const piani = this.currentMuseum.mappa.piante;
            const n = piani.length ? Math.max(...piani.map(p => p.piano)) + 1 : 0;
            piani.push({ piano: n, nome: n === 0 ? 'Piano terra' : `Piano ${n}`, immagine: '' });
        },

        removePiano(i) {
            this.currentMuseum.mappa.piante.splice(i, 1);
        },

        async uploadPianta(event, index) {
            const file = event.target.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('image', file);
            try {
                const res = await fetch('/api/upload/museum', {
                    method: 'POST',
                    headers: { 'Authorization': localStorage.getItem('artaround_token') },
                    body: formData
                });
                if (res.ok) {
                    const data = await res.json();
                    this.currentMuseum.mappa.piante[index].immagine = data.url;
                    this.showToast('Pianta caricata!', 'success');
                } else {
                    const err = await res.json();
                    this.showToast(err.error || 'Errore caricamento pianta', 'error');
                }
            } catch (e) {
                this.showToast('Errore di connessione durante l\'upload', 'error');
            }
        },

        // Scarta i piani senza immagine e le domande senza risposta
        buildMuseumPayload() {
            const mappa = this.currentMuseum.mappa || { piante: [], poi: [] };
            return {
                ...this.currentMuseum,
                mappa: {
                    piante: (mappa.piante || []).filter(p => p.immagine),
                    poi: (mappa.poi || []).filter(p => p.testo && p.testo.trim() !== '')
                }
            };
        },

        // --- UTILITY ---
        getMuseumName(id) {
            const m = this.museums.find(museo => museo._id === id);
            return m ? m.museum : 'Museo non selezionato';
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

        logout() {
            localStorage.removeItem('artaround_token');
            localStorage.removeItem('artaround_user');
            window.location.href = '/login.html';
        }
    };
}
