document.addEventListener('alpine:init', () => {
    Alpine.data('usersManager', () => ({
        isReady: false,
        username: '',
        permissions: '',
        propic: '',
        search: '',
        users: [],
        allMuseums: [],
        selectedUser: null,
        selectedMuseumId: '',
        pendingRequests: [],
        isEditingName: false,
        editNameValue: '',

        async init() {
            // 1. Controllo sicurezza
            const token = localStorage.getItem('artaround_token');
            if (!token) return window.location.href = '../index.html';

            try {
                // Verifica auth e permessi admin
                const authRes = await fetch('/api/check', {
                    method: 'POST',
                    headers: { 'Authorization': token }
                });

                const authData = await authRes.json();

                if (!authRes.ok || authData.user.permissions !== 'admin') {
                    window.location.href = '../index.html';
                    return;
                }

                this.username = authData.user.name;
                this.permissions = authData.user.permissions;

                // 2. Caricamento dati iniziali per la gestione
                await this.loadMuseums();
                await this.loadPendingRequests();

                // Carica inizialmente tutti gli editor
                const usersRes = await fetch('/editor/user-management/search?q=', {
                    headers: { 'Authorization': token }
                });
                const fetchedUsersInit = await usersRes.json();
                this.users = fetchedUsersInit.filter(u => u.name !== this.username);

                // Close user menu when clicking outside
                document.addEventListener('click', (e) => {
                    const menu = document.querySelector('.mobile-user-menu');
                    const btn = document.querySelector('.mobile-user-btn');
                    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
                        this.userMenuOpen = false;
                    }
                });

            } catch (error) {
                console.error("Errore inizializzazione:", error);
            } finally {
                this.isReady = true;
            }
        },

        async loadMuseums() {
            const res = await fetch('/api/museums');
            this.allMuseums = res.ok ? await res.json() : [];
        },

        async loadPendingRequests() {
            // not implemented yet
            this.pendingRequests = [];
        },

        // Ricerca dinamica
        async searchUsers() {
            const token = localStorage.getItem('artaround_token');
            const query = this.search.trim();
            const res = await fetch(`/editor/user-management/search?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': token }
            });
            const fetchedUsersSearch = res.ok ? await res.json() : [];
            this.users = fetchedUsersSearch.filter(u => u.name !== this.username);
        },

        // Seleziona un utente specifico per vederne i dettagli
        async selectUser(userId) {
            const token = localStorage.getItem('artaround_token');
            const res = await fetch(`/editor/user-management/${userId}`, {
                headers: {'Authorization': token}
            });
            if (!res.ok) return;
            this.selectedUser = await res.json();
            this.selectedMuseumId = '';
        },

        // Aggiunge un museo alla lista dell'autore
        async grantPermission() {
            if (!this.selectedMuseumId || !this.selectedUser) return;

            const token = localStorage.getItem('artaround_token');

            const res = await fetch(`/editor/user-management/${this.selectedUser._id}/museums/${this.selectedMuseumId}`, {
                method: 'POST',
                headers: {'Authorization': token}
            });

            if (res.ok) {
                this.selectedUser = await res.json(); // Backend deve restituire l'utente aggiornato con .populate('museums')
                this.selectedMuseumId = '';
                
                // Avviso se non ha i permessi corretti
                if (this.selectedUser.permissions !== 'admin' && this.selectedUser.permissions !== 'editor') {
                    alert("Attenzione: l'utente non avrà accesso all'amministrazione di questo museo se non gli assegni un ruolo appropriato (es. Editor). Usa la tendina per cambiarlo.");
                }
            }
        },

        // Rimuove un museo (Revoke)
        async revokePermission(museumId) {
            const token = localStorage.getItem('artaround_token');
            const res = await fetch(`/editor/user-management/${this.selectedUser._id}/museums/${museumId}`, {
                method: 'DELETE',
                headers: {'Authorization': token}
            });

            if (res.ok) {
                this.selectedUser = await res.json();
            }
        },

        // Cambia nome utente
        async updateUsername() {
            if (!this.selectedUser || !this.editNameValue.trim()) return;
            const newName = this.editNameValue.trim();
            if (newName === this.selectedUser.name) {
                this.isEditingName = false;
                return;
            }

            const token = localStorage.getItem('artaround_token');
            const res = await fetch(`/editor/user-management/${this.selectedUser._id}/name`, {
                method: 'PUT',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newName })
            });

            if (res.ok) {
                this.selectedUser = await res.json();
                this.isEditingName = false;
                await this.searchUsers();
            } else {
                const err = await res.json();
                alert(err.error || 'Errore durante l\'aggiornamento del nome');
            }
        },

        // Elimina un utente
        async deleteUser(userId) {
            if (!confirm('Sei sicuro di voler eliminare questo utente? Questa azione è irreversibile.')) return;

            const token = localStorage.getItem('artaround_token');
            const res = await fetch(`/editor/user-management/${userId}`, {
                method: 'DELETE',
                headers: {'Authorization': token}
            });

            if (res.ok) {
                this.selectedUser = null;
                await this.searchUsers();
            } else {
                alert('Errore durante l\'eliminazione dell\'utente');
            }
        },

        // Cambia ruolo utente
        async updateRole(newRole) {
            if (!this.selectedUser) return;
            const token = localStorage.getItem('artaround_token');
            const res = await fetch(`/editor/user-management/${this.selectedUser._id}/role`, {
                method: 'PUT',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ permissions: newRole })
            });

            if (res.ok) {
                this.selectedUser = await res.json();
                await this.searchUsers(); // Aggiorna anche la lista a sinistra
            } else {
                const err = await res.json();
                alert(err.error || 'Errore durante l\'aggiornamento del ruolo');
            }
        },

        logout() {
            localStorage.removeItem('artaround_token');
            window.location.href = '../index.html';
        }
    }));
});
