const POI_TIPI = [
    { tipo: 'toilette', domanda: 'Dove sono i servizi igienici?' },
    { tipo: 'bar',      domanda: "Dov'è la caffetteria?" },
    { tipo: 'shop',     domanda: "Dov'è il bookshop?" }
];
 
const PIN_TIPI = [
    { tipo: 'sala',      label: 'Sala',             icona: 'bi-door-open' },
    { tipo: 'ingresso',  label: 'Ingresso',         icona: 'bi-box-arrow-in-right',  domanda: "Dov'è l'ingresso?" },
    { tipo: 'uscita',    label: 'Uscita',           icona: 'bi-box-arrow-right',     domanda: "Dov'è l'uscita?" },
    { tipo: 'emergenza', label: 'Uscita emergenza', icona: 'bi-sign-turn-right',     domanda: "Dove sono le uscite di emergenza?" },
    { tipo: 'toilette',  label: 'Toilette',         icona: 'bi-person-standing',     domanda: "Dove sono i servizi igienici?" },
    { tipo: 'bar',       label: 'Bar',              icona: 'bi-cup-hot',             domanda: "Dov'è la caffetteria?" },
    { tipo: 'shop',      label: 'Shop',             icona: 'bi-bag',                 domanda: "Dov'è il bookshop?" },
    { tipo: 'scala',     label: 'Scale',            icona: 'bi-sort-numeric-up',     domanda: "Dove sono le scale?" },
    { tipo: 'ascensore', label: 'Ascensore',        icona: 'bi-arrow-down-up',       domanda: "Dov'è l'ascensore?" },
    { tipo: 'ostacolo',  label: 'Ostacolo',         icona: 'bi-exclamation-triangle', domanda: "Ci sono ostacoli all'accessibilità?" }
];

function museumManager() {
    return {
        isLoggedIn: false,
        username: '',
        permissions: '',
        propic: '',
        step: 'museum-list',
        isReady: false,
        isLoaded: false,

        museums: [],
        selectedMuseumId: '',
        artworks: [],

        museumSearch: '',
        selectedCity: '',
        visibleCount: window.innerWidth < 768 ? 5 : 9,
        _pageSize: window.innerWidth < 768 ? 5 : 9,

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

        visibleMuseums() {
            return this.filteredMuseumList().slice(0, this.visibleCount);
        },

        hasMore() {
            return this.filteredMuseumList().length > this.visibleCount;
        },

        loadMore() {
            this.visibleCount += this._pageSize;
        },

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
            type: 'success'
        },

        showToast(msg, type = 'success') {
            this.notification.message = msg;
            this.notification.type = type;
            this.notification.show = true;

            setTimeout(() => {
                this.notification.show = false;
            }, 4000);
        },

        async init() {
            await this.checkAuth();
            if (this.isLoggedIn) {
                await this.fetchMuseums();
                this.isLoaded = true;
            } else {
                this.logout();
            }
            this.isReady = true;

            this.$watch('museumSearch', () => {
                this.visibleCount = this._pageSize;
            });
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

        async fetchMuseums() {
            try {
                const token = localStorage.getItem('artaround_token');

                const response = await fetch('/api/museums', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    this.museums = data.map(m => ({
                        ...m,
                        mappa: this.normalizeMappa(m)
                    }));
                } else {
                    if (response.status === 401 || response.status === 403) {
                        this.logout();
                    } else {
                        console.error("Impossibile caricare i musei:", response.status);
                    }
                }
            } catch (error) {
                console.error("Errore durante il caricamento dei musei:", error);
            }
        },

        openMuseumForm(museum = null) {
            if (museum) {
                this.currentMuseum = JSON.parse(JSON.stringify(museum));
                if (!this.currentMuseum.image && this.currentMuseum.immagine) {
                    this.currentMuseum.image = this.currentMuseum.immagine;
                }
            } else {
                this.currentMuseum = { museum: '', city: '', province: '', region: '', address: '', description: '', image: '' };
            }
            this.currentMuseum.mappa = this.normalizeMappa(this.currentMuseum);
            this.salaSelezionata = null;
            this.isPinModalOpen = false;
            this.annullaPin();
            this.step = 'museum-form';
        },

        async saveMuseum() {
            const isEdit = !!this.currentMuseum._id;
            const museumName = this.currentMuseum.museum;
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
                    this.showToast(`Museo "${museumName}" salvato con successo!`, 'success');
                } else {
                    const err = await res.json();
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

        normalizeMappa(m) {
            const norm = (typeof MapUtils !== 'undefined') ? MapUtils.normalizeMappaData(m) : { piante: m?.mappa?.piante || [], sale: m?.mappa?.sale || [], poi: m?.mappa?.poi || [] };
            return {
                ...norm,
                poi: POI_TIPI.map(t => {
                    const esistente = (norm.poi || []).find(p => p.tipo === t.tipo);
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
        
        pinTipi: PIN_TIPI,
        salaSelezionata: null,    // indice in mappa.sale, oppure null
        pinMode: null,            // null | 'add' | 'move'
        pinModePiano: null,       // piano su cui è armata l'azione
        isPinModalOpen: false,
        pinDraft: { tipo: 'sala', nome: '', piano: 0 },
        
 
        iconaPin(tipo) {
            const t = PIN_TIPI.find(x => x.tipo === tipo);
            return t ? t.icona : 'bi-geo-alt-fill';
        },
 
        labelPin(tipo) {
            const t = PIN_TIPI.find(x => x.tipo === tipo);
            return t ? t.label : tipo;
        },

        // Un punto per ogni pin che non è una sala
        get puntiConDomanda() {
            return (this.currentMuseum.mappa?.sale || [])
                .map((s, idx) => ({ s, idx }))
                .filter(o => o.s.tipo !== 'sala');
        },

        domandaPin(tipo) {
            const t = PIN_TIPI.find(x => x.tipo === tipo);
            return t?.domanda || 'Come si raggiunge questo punto?';
        },
 
        // Punti di un piano, con l'indice originale nell'array vero.
        salePiano(piano) {
            const sale = this.currentMuseum.mappa.sale || [];
            return sale
                .map((s, idx) => ({ s, idx }))
                .filter(o => o.s.piano === piano);
        },
 
        // Nome suggerito: le sale si numerano, gli altri prendono il nome
        // del tipo. Il curatore lo può sempre riscrivere nella modale.
        nomeDefault(tipo) {
            const sale = this.currentMuseum.mappa.sale || [];
            if (tipo === 'sala') {
                return `Sala ${sale.filter(s => s.tipo === 'sala').length + 1}`;
            }
            const gia = sale.filter(s => s.tipo === tipo).length;
            return gia === 0 ? this.labelPin(tipo) : `${this.labelPin(tipo)} ${gia + 1}`;
        },
 
        // --- MODALE NUOVO PUNTO ---
        apriPinModal(piano) {
            this.annullaPin();
            this.pinDraft = { tipo: 'sala', nome: this.nomeDefault('sala'), piano };
            this.isPinModalOpen = true;
        },
 
        scegliTipoPin(tipo) {
            // Se il nome è ancora quello suggerito, lo riallinea al nuovo tipo.
            const eraSuggerito = this.pinDraft.nome === this.nomeDefault(this.pinDraft.tipo);
            this.pinDraft.tipo = tipo;
            if (eraSuggerito || !this.pinDraft.nome.trim()) {
                this.pinDraft.nome = this.nomeDefault(tipo);
            }
        },
 
        chiudiPinModal() {
            this.isPinModalOpen = false;
        },
 
        // Conferma la modale e arma il posizionamento sulla pianta.
        confermaPinDraft() {
            if (!this.pinDraft.nome.trim()) {
                this.showToast('Dai un nome al punto', 'error');
                return;
            }
            this.isPinModalOpen = false;
            this.pinMode = 'add';
            this.pinModePiano = this.pinDraft.piano;
            this.salaSelezionata = null;
        },
 
        // --- POSIZIONAMENTO SULLA PIANTA ---
        armaSpostamento(idx, piano) {
            this.pinMode = 'move';
            this.pinModePiano = piano;
            this.salaSelezionata = idx;
        },
 
        annullaPin() {
            this.pinMode = null;
            this.pinModePiano = null;
        },
 
        // La pianta risponde SOLO se c'è un'azione armata su quel piano.
        // Coordinate normalizzate 0-1: la mappa scala su qualsiasi schermo.
        mappaClick(event, piano) {
            if (this.pinMode === null || this.pinModePiano !== piano) return;

            const r = event.currentTarget.getBoundingClientRect();
            if (!r || r.width === 0 || r.height === 0) return;

            const x = Math.max(0, Math.min(1, (event.clientX - r.left) / r.width));
            const y = Math.max(0, Math.min(1, (event.clientY - r.top) / r.height));

            if (!this.currentMuseum.mappa) {
                this.currentMuseum.mappa = { piante: [], sale: [], poi: [] };
            }
            if (!this.currentMuseum.mappa.sale) {
                this.currentMuseum.mappa.sale = [];
            }
            const sale = this.currentMuseum.mappa.sale;

            if (this.pinMode === 'move' && sale[this.salaSelezionata]) {
                sale[this.salaSelezionata].x = x;
                sale[this.salaSelezionata].y = y;
            } else if (this.pinMode === 'add') {
                sale.push({
                    nome: this.pinDraft.nome.trim(),
                    piano, x, y,
                    tipo: this.pinDraft.tipo
                });
                this.salaSelezionata = sale.length - 1;
            }

            this.annullaPin();
        },
 
        // Click su un pin: lo evidenzia soltanto, non lo sposta.
        selezionaSala(idx) {
            this.salaSelezionata = (this.salaSelezionata === idx) ? null : idx;
        },
 
        removeSala(idx) {
            this.currentMuseum.mappa.sale.splice(idx, 1);
            this.salaSelezionata = null;
            this.annullaPin();
        },
 
        // Elimina il piano e i punti che ci stavano sopra, così non
        // restano punti orfani agganciati a una pianta inesistente.
        removePianoConSale(i) {
            const piano = this.currentMuseum.mappa.piante[i].piano;
            this.currentMuseum.mappa.piante.splice(i, 1);
            this.currentMuseum.mappa.sale =
                (this.currentMuseum.mappa.sale || []).filter(s => s.piano !== piano);
            this.salaSelezionata = null;
            this.annullaPin();
        },

        // Scarta i piani senza immagine e le domande senza risposta
        buildMuseumPayload() {
        const mappa = this.currentMuseum.mappa || { piante: [], sale: [], poi: [] };
        const sale = (mappa.sale || []).filter(s => s.nome && s.nome.trim() !== '');
        return {
            ...this.currentMuseum,
            mappa: {
                piante: (mappa.piante || []).filter(p => p.immagine),
                sale: sale,
                // Compatibilità: il Navigator legge ancora mappa.poi per i comandi
                // vocali. Lo generiamo dai pin, così il curatore compila un posto solo.
                // Da rimuovere quando VisitDetail.jsx leggerà mappa.sale.
                poi: sale
                    .filter(s => s.tipo !== 'sala' && s.risposta && s.risposta.trim())
                    .map(s => ({ tipo: s.tipo, piano: s.piano, testo: s.risposta }))
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
            window.location.href = '/login.html';
        }
    };
}
