/**
 * @file new-tour.js
 * Logic handler per la creazione dei tour con Alpine.js.
 */

document.addEventListener('alpine:init', () => {
    Alpine.data('newTourApp', () => ({
        // --- Component State ---
        isReady: false,
        isLoggedIn: false,
        username: '',
        permissions: '',

        // --- Persistence Data ---
        museums: [], // Caricati da MongoDB

        // --- Data Models (DTOs) ---
        tour: {
            name: '',
            museum_id: '',
            description: '',
            logistic_info: ['']
        },

        items: [], // Array Item + Language_Content

        async init() {
            const token = localStorage.getItem('artaround_token');
            if (!token) {
                window.location.href = '../index.html';
                return;
            }

            try {
                const authRes = await fetch('/api/check', {
                    method: 'POST',
                    headers: { 'Authorization': token }
                });

                if (!authRes.ok) throw new Error("Auth non valida");

                const authData = await authRes.json();

                if (authData.user.permissions !== 'admin') {
                    window.location.href = '../index.html';
                    return;
                }

                this.username = authData.user.name;
                this.permissions = authData.user.permissions;
                this.isLoggedIn = true;

                const musRes = await fetch('/admin/museums');
                if (musRes.ok) {
                    this.museums = await musRes.json();
                } else {
                    console.warn("Impossibile caricare la lista musei.");
                }

            } catch (error) {
                console.error("Initialization fault:", error);
            } finally {
                this.isReady = true;
            }
        },

        addLogistics() { this.tour.logistic_info.push(''); },
        removeLogistics(index) { this.tour.logistic_info.splice(index, 1); },

        addItem() {
            this.items.push({
                item_name: '',
                img_path: '',
                author: '',
                license: 'CC BY-SA 4.0',
                contents: [{ text: '', tone: 'medio', length: '15s' }]
            });
        },

        removeItem(index) { this.items.splice(index, 1); },

        addTone(itemIndex) {
            this.items[itemIndex].contents.push({ text: '', tone: 'semplice', length: '15s' });
        },

        async saveTour() {
            if (!this.tour.museum_id || this.items.length === 0) {
                alert("Errore validazione: Seleziona un museo e aggiungi almeno un'opera.");
                return;
            }

            try {
                const response = await fetch('/admin/tours', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': localStorage.getItem('artaround_token')
                    },
                    body: JSON.stringify({ tour: this.tour, items: this.items })
                });

                if (response.ok) {
                    alert("Persistenza completata: Tour pubblicato.");
                    window.location.href = 'editor.html';
                } else {
                    const errData = await response.json();
                    alert("Errore server: " + errData.error);
                }
            } catch (error) {
                alert("Errore critico durante la richiesta POST.");
            }
        },

        logout() {
            localStorage.removeItem('artaround_token');
            window.location.href = '../index.html';
        }
    }));
});
