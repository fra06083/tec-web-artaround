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
        isProfileModalOpen: false,
        profileForm: { name: '', propic: '' },

        async init() {
            const savedDarkMode = localStorage.getItem('artaround_darkmode');
            this.darkMode = savedDarkMode === 'true';

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

            // CACHE LOCALE (per rendering istantaneo)
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

            // VALIDAZIONE IN BACKGROUND
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
            this.isProfileModalOpen = true;
        },

        async updateProfile() {
            try {
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
                    localStorage.setItem('artaround_user', JSON.stringify(data.user));
                    this.isProfileModalOpen = false;
                    alert('Profilo aggiornato con successo');
                } else {
                    alert('Errore aggiornamento profilo');
                }
            } catch (error) {
                console.error("Errore aggiornamento profilo", error);
            }
        },

        async uploadProfileImage(event) {
            // grab the first file selected by the user
            const file = event.target.files[0];
            if (!file) return;

            // wrap the file in FormData so we can send it as multipart/form-data
            const formData = new FormData();
            formData.append('image', file);

            try {
                // send the file to our backend upload route
                const token = localStorage.getItem('artaround_token');
                const response = await fetch('/api/upload/user', {
                    method: 'POST',
                    headers: { 'Authorization': token },
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    // update the form state with the new URL so the UI updates instantly
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
