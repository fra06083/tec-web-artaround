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
        isEditingName: false,
        editNameValue: '',

        async init() {
            const token = localStorage.getItem('artaround_token');
            if (!token) return window.location.href = '../index.html';

            const savedUserDataStr = localStorage.getItem('artaround_user_data');
            if (savedUserDataStr) {
                try {
                    const savedUserData = JSON.parse(savedUserDataStr);
                    this.username = savedUserData.name || localStorage.getItem('artaround_user') || '';
                    this.permissions = savedUserData.permissions || '';
                    this.propic = savedUserData.propic || '';
                } catch (e) {
                    console.error('Error parsing saved user data', e);
                }
            } else {
                this.username = localStorage.getItem('artaround_user') || '';
            }

            try {
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
                this.propic = authData.user.propic || '';
                
                localStorage.setItem('artaround_user_data', JSON.stringify(authData.user));

                await this.loadMuseums();

                const usersRes = await fetch('/editor/user-management/search?q=', {
                    headers: { 'Authorization': token }
                });
                this.users = usersRes.ok ? await usersRes.json() : [];

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

        async searchUsers() {
            const token = localStorage.getItem('artaround_token');
            const query = this.search.trim();
            const res = await fetch(`/editor/user-management/search?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': token }
            });
            this.users = res.ok ? await res.json() : [];
        },

        async selectUser(userId) {
            const token = localStorage.getItem('artaround_token');
            const res = await fetch(`/editor/user-management/${userId}`, {
                headers: {'Authorization': token}
            });
            if (!res.ok) return;
            this.selectedUser = await res.json();
            this.selectedMuseumId = '';
        },

        async grantPermission() {
            if (!this.selectedMuseumId || !this.selectedUser) return;

            const token = localStorage.getItem('artaround_token');

            const res = await fetch(`/editor/user-management/${this.selectedUser._id}/museums/${this.selectedMuseumId}`, {
                method: 'POST',
                headers: {'Authorization': token}
            });

            if (res.ok) {
                this.selectedUser = await res.json();
                this.selectedMuseumId = '';
                
                if (this.selectedUser.permissions !== 'admin' && this.selectedUser.permissions !== 'editor') {
                    alert("Attenzione: l'utente non avrà accesso all'amministrazione di questo museo se non gli assegni un ruolo appropriato (es. Editor). Usa la tendina per cambiarlo.");
                }
            }
        },

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
                await this.searchUsers();
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
