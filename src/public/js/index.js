function homeApp() {
    const token = localStorage.getItem('artaround_token');
    const savedUserStr = localStorage.getItem('artaround_user');
    let savedUser = null;
    if (savedUserStr) {
        try { savedUser = JSON.parse(savedUserStr); } catch(e) {}
    }
    
    return {
        isLoggedIn: !!token,
        username: savedUser ? savedUser.name : '',
        permissions: savedUser ? savedUser.permissions : '',
        propic: savedUser ? savedUser.propic : '',
        darkMode: false,
        preferredLevel: localStorage.getItem('artaround_preferred_level') || 'medio',
        isProfileModalOpen: false,

        profileForm: { name: '', propic: '', nameError: '' },

        async init() {
            const savedDarkMode = localStorage.getItem('artaround_darkmode');
            this.darkMode = savedDarkMode === 'true';

            // Sincronizza la classe dark-mode sull'elemento radice <html> e persiste la scelta
            this.$watch('darkMode', (value) => {
                localStorage.setItem('artaround_darkmode', value);
                if (value) {
                    document.documentElement.classList.add('dark-mode');
                } else {
                    document.documentElement.classList.remove('dark-mode');
                }
            });

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
                } catch (e) {
                    console.error('Error parsing saved user data', e);
                }
            }

            try {
                const response = await fetch('/api/check', {
                    method: 'POST',
                    headers: { 'Authorization': token }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.username = data.user?.name || savedUsername;
                    this.permissions = data.user?.permissions;
                    this.propic = data.user?.propic || '';
                    this.isLoggedIn = true;
                    localStorage.setItem('artaround_user_data', JSON.stringify(data.user));
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error("Auth failed:", error);
                this.isLoggedIn = false;
            }
        },

        logout() {
            localStorage.removeItem('artaround_token');
            localStorage.removeItem('artaround_user');
            this.isLoggedIn = false;
            this.username = '';
            this.permissions = '';
            window.location.href = 'index.html';
        },

        openProfileModal() {
            this.profileForm.name = this.username;
            this.profileForm.propic = this.propic;
            this.profileForm.preferredLevel = localStorage.getItem('artaround_preferred_level') || 'medio';
            this.isProfileModalOpen = true;

            // Chiude eventuali offcanvas mobile aperti prima di mostrare la modale del profilo
            const openOffcanvasList = document.querySelectorAll('.offcanvas.show');
            openOffcanvasList.forEach(el => {
                if (typeof bootstrap !== 'undefined') {
                    const instance = bootstrap.Offcanvas.getInstance(el) || new bootstrap.Offcanvas(el);
                    if (instance) instance.hide();
                }
            });
        },

        // Validazione sincrona del formato dell'username lato client
        validateUsername(val) {
            if (val.length < 5) return "L'username deve avere almeno 5 caratteri.";
            if (/\s/.test(val)) return "Gli spazi non sono consentiti. Usa '_' o '.'.";
            if (!/^[a-zA-Z0-9_.]+$/.test(val)) return "Caratteri non validi. Usa solo lettere, numeri, '_' e '.'.";
            return "";
        },

        async updateProfile() {
            this.profileForm.nameError = this.validateUsername(this.profileForm.name);
            if (this.profileForm.nameError) return;

            try {
                if (this.profileForm.preferredLevel) {
                    localStorage.setItem('artaround_preferred_level', this.profileForm.preferredLevel);
                }
                const token = localStorage.getItem('artaround_token');
                const response = await fetch('/api/profile', {
                    method: 'PUT',
                    headers: {
                        'Authorization': token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.profileForm)
                });
                if (response.ok) {
                    const data = await response.json();
                    this.username = data.user.name;
                    this.propic = data.user.propic;
                    const updatedUser = { ...data.user, preferredLevel: this.profileForm.preferredLevel };
                    localStorage.setItem('artaround_user', JSON.stringify(updatedUser));
                    this.isProfileModalOpen = false;
                    alert('Profilo aggiornato con successo');
                } else {
                    const err = await response.json();
                    if (err.error === 'Nome utente già in uso' || err.error?.toLowerCase().includes('in uso')) {
                        this.profileForm.nameError = err.error;
                    } else {
                        alert(err.error || 'Errore aggiornamento profilo');
                    }
                }
            } catch (error) {
                console.error("Errore aggiornamento profilo", error);
            }
        },

        removeProfileImage() {
            this.profileForm.propic = '';
        },

        async uploadProfileImage(event) {
            const file = event.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('image', file);

            try {
                const token = localStorage.getItem('artaround_token');
                const response = await fetch('/api/upload/user', {
                    method: 'POST',
                    headers: { 'Authorization': token },
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    this.profileForm.propic = data.url;
                } else {
                    const err = await response.json();
                    alert(err.error || 'Errore durante il caricamento');
                }
            } catch (error) {
                console.error("Errore upload:", error);
                alert('Errore durante il caricamento');
            }
        }
    }
}
