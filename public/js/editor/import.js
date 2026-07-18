function importManager() {
    return {
        // --- STATO SESSIONE ---
        isLoggedIn: false,
        username: '',
        permissions: '',
        isReady: false,

        // --- DATI ---
        importedData: null,
        importResults: {
            museums: { success: 0, failed: 0, errors: [] },
            artworks: { success: 0, failed: 0, errors: [] }
        },

        // --- FILE UPLOAD ---
        selectedFile: null,
        isUploading: false,
        showPreview: false,
        showResults: false,

        // --- NOTIFICHE ---
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

        // --- INIZIALIZZAZIONE ---
        async init() {
            await this.checkAuth();
            if (this.isLoggedIn && this.permissions === 'admin') {
                this.isReady = true;
            } else {
                window.location.href = '/login.html';
            }
        },

        // --- AUTENTICAZIONE ---
        async checkAuth() {
            try {
                const token = localStorage.getItem('artaround_token');
                const savedUsername = localStorage.getItem('artaround_user');
                if (!token) { this.isLoggedIn = false; return; }

                if (savedUsername) {
                    this.username = savedUsername;
                    this.isLoggedIn = true;
                }

                const response = await fetch('/api/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': token }
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

        // --- GESTIONE FILE ---
        handleFileSelect(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
                this.showToast('Seleziona un file JSON valido', 'error');
                return;
            }

            this.selectedFile = file;
            this.parseJSONFile(file);
        },

        parseJSONFile(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    this.validateAndPreview(data);
                } catch (error) {
                    this.showToast('Errore nel parsing del file JSON', 'error');
                    this.selectedFile = null;
                }
            };
            reader.readAsText(file);
        },

        validateAndPreview(data) {
            // Struttura attesa:
            // {
            //   "museums": [
            //     { "museum": "Nome", "city": "Città", "province": "PR", "region": "Regione", "address": "Indirizzo", "description": "Desc", "image": "URL" }
            //   ],
            //   "artworks": [
            //     { "item": "Nome opera", "img_path": "URL", "museum_name": "Nome museo", "author": "Autore", "license": "Licenza" }
            //   ]
            // }

            const errors = [];

            if (!data.museums && !data.artworks) {
                errors.push('Il file deve contenere almeno "museums" o "artworks"');
            }

            if (data.museums && !Array.isArray(data.museums)) {
                errors.push('"museums" deve essere un array');
            }

            if (data.artworks && !Array.isArray(data.artworks)) {
                errors.push('"artworks" deve essere un array');
            }

            if (errors.length > 0) {
                this.showToast(errors.join(', '), 'error');
                this.selectedFile = null;
                return;
            }

            this.importedData = data;
            this.showPreview = true;
        },

        // --- IMPORTAZIONE ---
        async importData() {
            if (!this.importedData) return;

            this.isUploading = true;
            this.importResults = {
                museums: { success: 0, failed: 0, errors: [] },
                artworks: { success: 0, failed: 0, errors: [] }
            };

            const token = localStorage.getItem('artaround_token');

            try {
                // Importa musei
                if (this.importedData.museums && this.importedData.museums.length > 0) {
                    for (const museum of this.importedData.museums) {
                        try {
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
                        } catch (e) {
                            this.importResults.museums.failed++;
                            this.importResults.museums.errors.push(`${museum.museum}: Errore di connessione`);
                        }
                    }
                }

                // Importa opere
                if (this.importedData.artworks && this.importedData.artworks.length > 0) {
                    // Prima ottieni la lista dei musei per mappare i nomi agli ID
                    const museumsRes = await fetch('/api/museums', {
                        headers: { 'Authorization': token }
                    });
                    const museums = museumsRes.ok ? await museumsRes.json() : [];

                    for (const artwork of this.importedData.artworks) {
                        try {
                            // Trova l'ID del museo dal nome
                            const museum = museums.find(m => m.museum === artwork.museum_name);
                            if (!museum) {
                                this.importResults.artworks.failed++;
                                this.importResults.artworks.errors.push(`${artwork.item}: Museo "${artwork.museum_name}" non trovato`);
                                continue;
                            }

                            const artworkData = {
                                item: artwork.item,
                                img_path: artwork.img_path,
                                museum_id: museum._id,
                                author: artwork.author,
                                license: artwork.license,
                                description: artwork.description || 'Nessuna descrizione fornita.',
                                desc_type: artwork.desc_type || 'medio'
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
                        } catch (e) {
                            this.importResults.artworks.failed++;
                            this.importResults.artworks.errors.push(`${artwork.item}: Errore di connessione`);
                        }
                    }
                }

                this.showResults = true;
                this.showToast('Importazione completata!', 'success');

            } catch (error) {
                this.showToast('Errore durante l\'importazione', 'error');
            } finally {
                this.isUploading = false;
            }
        },

        // --- RESET ---
        resetImport() {
            this.selectedFile = null;
            this.importedData = null;
            this.importResults = {
                museums: { success: 0, failed: 0, errors: [] },
                artworks: { success: 0, failed: 0, errors: [] }
            };
            this.showPreview = false;
            this.showResults = false;
        },

        // --- ESEMPIO JSON ---
        downloadExample() {
            const example = {
                "museums": [
                    {
                        "museum": "Museo di Arte Moderna",
                        "city": "Milano",
                        "province": "MI",
                        "region": "Lombardia",
                        "address": "Via della Pace 10",
                        "description": "Museo dedicato all'arte contemporanea",
                        "image": "https://example.com/museum.jpg"
                    }
                ],
                "artworks": [
                    {
                        "item": "Ritratto di Donna",
                        "img_path": "https://example.com/artwork.jpg",
                        "museum_name": "Museo di Arte Moderna",
                        "author": "Mario Rossi",
                        "license": "CC BY 4.0",
                        "description": "Una bellissima opera d'arte moderna.",
                        "desc_type": "medio"
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
