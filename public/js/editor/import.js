function importManager() {
    return {
        isLoggedIn: false,
        username: '',
        permissions: '',
        propic: '',
        isReady: false,

        importedData: { museums: [], artworks: [], tours: [] },
        importResults: {
            museums: { success: 0, skipped: 0, failed: 0, skippedList: [], errors: [] },
            artworks: { success: 0, skipped: 0, failed: 0, skippedList: [], errors: [] },
            tours: { success: 0, skipped: 0, failed: 0, skippedList: [], errors: [] }
        },

        selectedFile: null,
        isUploading: false,
        showPreview: false,
        showResults: false,

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
            const savedUserDataStr = localStorage.getItem('artaround_user_data');
            if (savedUserDataStr) {
                try {
                    const savedUserData = JSON.parse(savedUserDataStr);
                    this.username = savedUserData.name || localStorage.getItem('artaround_user') || '';
                    this.permissions = savedUserData.permissions || '';
                    this.propic = savedUserData.propic || '';
                    if (this.permissions === 'admin') {
                        this.isLoggedIn = true;
                        this.isReady = true;
                    }
                } catch (e) {
                    console.error('Error parsing saved user data', e);
                }
            }
            await this.checkAuth();
            if (this.isLoggedIn && this.permissions === 'admin') {
                this.isReady = true;
            } else if (!this.isReady) {
                window.location.href = '/login.html';
            }
        },

        async checkAuth() {
            try {
                const token = localStorage.getItem('artaround_token');
                const savedUsername = localStorage.getItem('artaround_user');

                if (savedUsername) {
                    this.username = savedUsername;
                }
                
                const savedUserDataStr = localStorage.getItem('artaround_user_data');
                if (savedUserDataStr) {
                    try {
                        const savedUserData = JSON.parse(savedUserDataStr);
                        this.permissions = savedUserData.permissions || '';
                        this.propic = savedUserData.propic || '';
                    } catch (e) {
                        console.error('Error parsing saved user data', e);
                    }
                }

                if (!token && !this.permissions) {
                    this.isLoggedIn = false;
                    return;
                }

                const response = await fetch('/api/check', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': token } : {})
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.username = data.user?.name || savedUsername;
                    this.permissions = data.user?.permissions;
                    this.propic = data.user?.propic || '';
                    this.isLoggedIn = true;
                    localStorage.setItem('artaround_user_data', JSON.stringify(data.user));
                } else if (this.permissions === 'admin') {
                    this.isLoggedIn = true;
                } else {
                    this.isLoggedIn = false;
                }
            } catch (error) {
                console.error('Errore durante il controllo autorizzazione:', error);
                if (this.permissions === 'admin') {
                    this.isLoggedIn = true;
                }
            }
        },

        logout() {
            localStorage.removeItem('artaround_token');
            localStorage.removeItem('artaround_user');
            window.location.href = '/login.html';
        },

        handleFileSelect(event) {
            const file = event.target?.files?.[0] || event.dataTransfer?.files?.[0];
            if (!file) return;

            if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
                this.showToast('Seleziona un file JSON valido', 'error');
                this.selectedFile = null;
                return;
            }

            this.selectedFile = file;
            this.parseJSONFile(file);
        },

        // Legge ed esegue il parsing del file selezionato prima della validazione
        parseJSONFile(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    this.validateAndPreview(data);
                } catch (error) {
                    this.showToast('Errore nel parsing del file JSON', 'error');
                    this.selectedFile = null;
                    this.showPreview = false;
                }
            };
            reader.readAsText(file);
        },

        // Controlla che il file contenga almeno la lista "museums", "artworks" o "tours" / "visits" in formato array
        validateAndPreview(data) {
            const errors = [];

            if (data.visits && !data.tours) {
                data.tours = data.visits;
            }

            if (!data.museums && !data.artworks && !data.tours) {
                errors.push('Il file deve contenere almeno "museums", "artworks" o "tours"');
            }

            if (data.museums && !Array.isArray(data.museums)) {
                errors.push('"museums" deve essere un array');
            }

            if (data.artworks && !Array.isArray(data.artworks)) {
                errors.push('"artworks" deve essere un array');
            }

            if (data.tours && !Array.isArray(data.tours)) {
                errors.push('"tours" deve essere un array');
            }

            if (errors.length > 0) {
                this.showToast(errors.join(', '), 'error');
                this.selectedFile = null;
                this.showPreview = false;
                return;
            }

            this.importedData = {
                museums: data.museums || [],
                artworks: data.artworks || [],
                tours: data.tours || []
            };
            this.showPreview = true;
        },

        // Esegue l'importazione in batch di musei, opere e visite.
        // Se un elemento esiste già, viene classificato come "Già presente" (skipped), NON come errore.
        async importData() {
            if (!this.selectedFile || !this.importedData) {
                this.showToast('Seleziona prima un file JSON da importare', 'error');
                return;
            }

            if ((!this.importedData.museums || this.importedData.museums.length === 0) &&
                (!this.importedData.artworks || this.importedData.artworks.length === 0) &&
                (!this.importedData.tours || this.importedData.tours.length === 0)) {
                this.showToast('Il file JSON non contiene musei, opere o visite da importare', 'error');
                return;
            }

            this.isUploading = true;
            this.importResults = {
                museums: { success: 0, skipped: 0, failed: 0, skippedList: [], errors: [] },
                artworks: { success: 0, skipped: 0, failed: 0, skippedList: [], errors: [] },
                tours: { success: 0, skipped: 0, failed: 0, skippedList: [], errors: [] }
            };

            const token = localStorage.getItem('artaround_token');

            try {
                // 1. CARICA MUSEI ESISTENTI PER CONTROLLO DI ESISTENZA
                const existingMuseumsRes = await fetch('/api/museums', {
                    headers: { 'Authorization': token }
                });
                let existingMuseums = existingMuseumsRes.ok ? await existingMuseumsRes.json() : [];

                // IMPORTAZIONE MUSEI
                if (this.importedData.museums && this.importedData.museums.length > 0) {
                    for (const museum of this.importedData.museums) {
                        try {
                            const museumNameClean = (museum.museum || '').trim().toLowerCase();
                            const exists = existingMuseums.find(m => (m.museum || '').trim().toLowerCase() === museumNameClean);

                            // Normalizza le coordinate x, y della mappa
                            if (museum.mappa && Array.isArray(museum.mappa.sale)) {
                                museum.mappa.sale = museum.mappa.sale.map(s => ({
                                    ...s,
                                    x: (typeof s.x === 'number' && s.x > 1) ? s.x / 100 : (s.x || 0),
                                    y: (typeof s.y === 'number' && s.y > 1) ? s.y / 100 : (s.y || 0)
                                }));
                            }

                            if (exists) {
                                // Se il museo esiste già, aggiorniamo la sua mappa/pin/piante dal JSON di importazione
                                if (museum.mappa) {
                                    await fetch(`/api/museums/${exists._id}`, {
                                        method: 'PUT',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': token
                                        },
                                        body: JSON.stringify({
                                            museum: museum.museum,
                                            city: museum.city || exists.city,
                                            province: museum.province || exists.province,
                                            region: museum.region || exists.region,
                                            address: museum.address || exists.address,
                                            description: museum.description || exists.description,
                                            image: museum.image || exists.image,
                                            mappa: museum.mappa
                                        })
                                    });
                                }
                                this.importResults.museums.skipped++;
                                this.importResults.museums.skippedList.push(`${museum.museum}: Già presente (mappa e pin applicati)`);
                            } else {
                                const res = await fetch('/api/museums', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': token
                                    },
                                    body: JSON.stringify(museum)
                                });

                                if (res.ok) {
                                    this.importResults.museums.success++;
                                } else {
                                    const err = await res.json();
                                    this.importResults.museums.failed++;
                                    this.importResults.museums.errors.push(`${museum.museum}: ${err.error || 'Errore'}`);
                                }
                            }
                        } catch (e) {
                            this.importResults.museums.failed++;
                            this.importResults.museums.errors.push(`${museum.museum}: Errore di connessione`);
                        }
                    }

                    // Aggiorniamo l'elenco dei musei esistenti in memoria
                    const freshMuseumsRes = await fetch('/api/museums', {
                        headers: { 'Authorization': token }
                    });
                    if (freshMuseumsRes.ok) {
                        existingMuseums = await freshMuseumsRes.json();
                    }
                }

                // 2. CARICA OPERE ESISTENTI PER CONTROLLO DI ESISTENZA
                const existingArtworksRes = await fetch('/api/artworks', {
                    headers: { 'Authorization': token }
                });
                let existingArtworks = existingArtworksRes.ok ? await existingArtworksRes.json() : [];

                // IMPORTAZIONE OPERE
                if (this.importedData.artworks && this.importedData.artworks.length > 0) {
                    for (const artwork of this.importedData.artworks) {
                        try {
                            const museum = existingMuseums.find(m => (m.museum || '').trim().toLowerCase() === (artwork.museum_name || '').trim().toLowerCase());
                            if (!museum) {
                                this.importResults.artworks.failed++;
                                this.importResults.artworks.errors.push(`${artwork.item}: Museo "${artwork.museum_name}" non trovato`);
                                continue;
                            }

                            const artworkNameClean = (artwork.item || '').trim().toLowerCase();
                            const artworkExists = existingArtworks.find(a => (a.item || '').trim().toLowerCase() === artworkNameClean);

                            if (artworkExists) {
                                if (artwork.sala) {
                                    await fetch(`/api/artworks/${artworkExists._id}`, {
                                        method: 'PUT',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': token
                                        },
                                        body: JSON.stringify({
                                            item: artwork.item,
                                            img_path: artwork.img_path || artworkExists.img_path,
                                            museum_id: museum._id,
                                            author: artwork.author || artworkExists.author,
                                            license: artwork.license || artworkExists.license,
                                            sala: artwork.sala,
                                            description: artwork.description || 'Nessuna descrizione.'
                                        })
                                    });
                                }
                                this.importResults.artworks.skipped++;
                                this.importResults.artworks.skippedList.push(`${artwork.item}: Già presente (sala applicata)`);
                            } else {
                                const artworkData = {
                                    item: artwork.item,
                                    img_path: artwork.img_path,
                                    museum_id: museum._id,
                                    author: artwork.author,
                                    license: artwork.license,
                                    description: artwork.description || 'Nessuna descrizione fornita.',
                                    desc_type: artwork.desc_type || 'medio',
                                    sala: artwork.sala
                                };

                                const res = await fetch('/api/artworks', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': token
                                    },
                                    body: JSON.stringify(artworkData)
                                });

                                if (res.ok) {
                                    this.importResults.artworks.success++;
                                } else {
                                    const err = await res.json();
                                    this.importResults.artworks.failed++;
                                    this.importResults.artworks.errors.push(`${artwork.item}: ${err.error || 'Errore'}`);
                                }
                            }
                        } catch (e) {
                            this.importResults.artworks.failed++;
                            this.importResults.artworks.errors.push(`${artwork.item}: Errore di connessione`);
                        }
                    }

                    // Aggiorniamo l'elenco delle opere esistenti in memoria
                    const freshArtworksRes = await fetch('/api/artworks', {
                        headers: { 'Authorization': token }
                    });
                    if (freshArtworksRes.ok) {
                        existingArtworks = await freshArtworksRes.json();
                    }
                }

                // 3. CARICA VISITE ESISTENTI PER CONTROLLO DI ESISTENZA
                const existingVisitsRes = await fetch('/api/visite', {
                    headers: { 'Authorization': token }
                });
                let existingVisits = existingVisitsRes.ok ? await existingVisitsRes.json() : [];

                // IMPORTAZIONE VISITE (TOURS)
                if (this.importedData.tours && this.importedData.tours.length > 0) {
                    for (const tour of this.importedData.tours) {
                        try {
                            const museum = existingMuseums.find(m => (m.museum || '').trim().toLowerCase() === (tour.museum_name || '').trim().toLowerCase());
                            if (!museum) {
                                this.importResults.tours.failed++;
                                this.importResults.tours.errors.push(`${tour.name}: Museo "${tour.museum_name}" non trovato`);
                                continue;
                            }

                            const tourNameClean = (tour.name || '').trim().toLowerCase();
                            const tourExists = existingVisits.find(v => (v.name || '').trim().toLowerCase() === tourNameClean && (v.museum_id?._id || v.museum_id)?.toString() === museum._id.toString());

                            if (tourExists) {
                                this.importResults.tours.skipped++;
                                this.importResults.tours.skippedList.push(`${tour.name}: Già presente nel sistema`);
                            } else {
                                let itemIds = [];
                                if (Array.isArray(tour.items)) {
                                    itemIds = tour.items.map(itemName => {
                                        const match = existingArtworks.find(a => (a.item || '').trim().toLowerCase() === (itemName || '').trim().toLowerCase() || a._id === itemName);
                                        return match ? match._id : null;
                                    }).filter(Boolean);
                                }

                                const tourData = {
                                    name: tour.name,
                                    description: tour.description || '',
                                    image: tour.image || '',
                                    museum_id: museum._id,
                                    items: itemIds,
                                    logistic_info: tour.logistic_info || [],
                                    tags: tour.tags || [],
                                    mnemonicCode: tour.mnemonicCode || '',
                                    isPrivate: tour.isPrivate || false,
                                    prezzo: tour.prezzo || 0
                                };

                                const res = await fetch('/api/visite', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': token
                                    },
                                    body: JSON.stringify(tourData)
                                });

                                if (res.ok) {
                                    this.importResults.tours.success++;
                                } else {
                                    const err = await res.json();
                                    this.importResults.tours.failed++;
                                    this.importResults.tours.errors.push(`${tour.name}: ${err.error || 'Errore'}`);
                                }
                            }
                        } catch (e) {
                            this.importResults.tours.failed++;
                            this.importResults.tours.errors.push(`${tour.name}: Errore di connessione`);
                        }
                    }
                }

                this.showResults = true;
                this.showToast('Importazione completata con successo!', 'success');

            } catch (error) {
                console.error('Errore durante l\'importazione:', error);
                this.showToast('Errore durante l\'importazione', 'error');
            } finally {
                this.isUploading = false;
            }
        },

        resetImport() {
            this.selectedFile = null;
            this.importedData = { museums: [], artworks: [], tours: [] };
            this.importResults = {
                museums: { success: 0, skipped: 0, failed: 0, skippedList: [], errors: [] },
                artworks: { success: 0, skipped: 0, failed: 0, skippedList: [], errors: [] },
                tours: { success: 0, skipped: 0, failed: 0, skippedList: [], errors: [] }
            };
            this.showPreview = false;
            this.showResults = false;
        },

        // Genera e scarica un file JSON di esempio per guidare l'utente sulla struttura corretta
        downloadExample() {
            const example = {
                "museums": [
                    {
                        "museum": "Museo d'Arte Moderna e Contemporanea",
                        "city": "Milano",
                        "province": "MI",
                        "region": "Lombardia",
                        "address": "Via della Spiga, 24",
                        "description": "Un'iconica istituzione culturale situata nel cuore di Milano, dedicata alle espressioni artistiche del Novecento e del nuovo millennio.",
                        "image": "/img/ritratto_donna_luce.jpg",
                        "mappa": {
                            "piante": [
                                {
                                    "piano": 0,
                                    "nome": "Piano Terra - Galleria Principale",
                                    "immagine": "/img/piantina_museo_esempio.jpg"
                                }
                            ],
                            "sale": [
                                {
                                    "nome": "Ingresso Principale",
                                    "piano": 0,
                                    "x": 0.5,
                                    "y": 0.8,
                                    "tipo": "ingresso",
                                    "risposta": "Benvenuto all'Ingresso Principale del Museo."
                                },
                                {
                                    "nome": "Sala del Novecento",
                                    "piano": 0,
                                    "x": 0.5,
                                    "y": 0.33,
                                    "tipo": "sala",
                                    "risposta": "Benvenuto nella Sala del Novecento!"
                                },
                                {
                                    "nome": "Salone delle Sculture",
                                    "piano": 0,
                                    "x": 0.77,
                                    "y": 0.33,
                                    "tipo": "sala",
                                    "risposta": "Qui trovi le sculture tridimensionali contemporanee."
                                },
                                {
                                    "nome": "Caffetteria del Museo",
                                    "piano": 0,
                                    "x": 0.83,
                                    "y": 0.8,
                                    "tipo": "bar",
                                    "risposta": "La caffetteria offre pause ristoro e snack leggeri."
                                }
                            ],
                            "poi": [
                                {
                                    "tipo": "toilette",
                                    "piano": 0,
                                    "testo": "Servizi igienici al piano terra accanto alla caffetteria."
                                },
                                {
                                    "tipo": "bar",
                                    "piano": 0,
                                    "testo": "Caffetteria del Museo."
                                },
                                {
                                    "tipo": "shop",
                                    "piano": 0,
                                    "testo": "Bookshop all'ingresso."
                                }
                            ]
                        }
                    }
                ],
                "artworks": [
                    {
                        "item": "Ritratto di Donna in Luce",
                        "img_path": "/img/ritratto_donna_luce.jpg",
                        "museum_name": "Museo d'Arte Moderna e Contemporanea",
                        "author": "Mario Rossi",
                        "license": "CC BY 4.0",
                        "description": "Una celebre opera a olio su tela realizzata nei primi anni del Novecento, caratterizzata da giochi di luce caldi ed espressivi.",
                        "desc_type": "medio",
                        "sala": {
                            "nome": "Sala del Novecento",
                            "piano": 0
                        }
                    },
                    {
                        "item": "Dinamismo Astratto in Bronzo",
                        "img_path": "/img/dinamismo_astratto_bronzo.jpg",
                        "museum_name": "Museo d'Arte Moderna e Contemporanea",
                        "author": "Giulia Bianchi",
                        "license": "Pubblico Dominio",
                        "description": "Scultura tridimensionale in bronzo spazzolato che esplora il movimento ed il ritmo nello spazio contemporaneo.",
                        "desc_type": "dettagliato",
                        "sala": {
                            "nome": "Salone delle Sculture",
                            "piano": 0
                        }
                    }
                ],
                "tours": [
                    {
                        "name": "Percorso Grandi Capolavori del Novecento",
                        "description": "Un tour guidato completo tra le opere e le sculture più importanti della collezione milanese.",
                        "image": "/img/ritratto_donna_luce.jpg",
                        "museum_name": "Museo d'Arte Moderna e Contemporanea",
                        "items": [
                            "Ritratto di Donna in Luce",
                            "Dinamismo Astratto in Bronzo"
                        ],
                        "logistic_info": [
                            "Ingresso principale da Via della Spiga, 24",
                            "Durata stimata del percorso: 50 minuti",
                            "Accessibilità completa per sedie a rotelle"
                        ],
                        "tags": [
                            "Arte",
                            "Milano",
                            "Novecento",
                            "Scultura"
                        ],
                        "prezzo": 0,
                        "isPrivate": false
                    }
                ]
            };

            const blob = new Blob([JSON.stringify(example, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'esempio_importazione.json';
            a.click();
            URL.revokeObjectURL(url);
        }
    };
}
