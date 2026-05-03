function homeApp() {
    return {
        isLoggedIn: false,
        username: '',
        darkMode: false,

        async init() {
            // Load dark mode preference
            const savedDarkMode = localStorage.getItem('artaround_darkmode');
            this.darkMode = savedDarkMode === 'true';

            // Watch for dark mode changes
            this.$watch('darkMode', (value) => {
                localStorage.setItem('artaround_darkmode', value);
            });

            const token = localStorage.getItem('artaround_token');
            if (!token) {
                this.isLoggedIn = false;
                return;
            }

            try {
                const response = await fetch('/api/check', {
                    method: 'POST',
                    headers: { 'Authorization': token }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.username = data.user.name;
                    this.isLoggedIn = true;
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error("Auth failed:", error);
            }
        },

        logout() {
            localStorage.removeItem('artaround_token');
            localStorage.removeItem('artaround_user');
            this.isLoggedIn = false;
            this.username = '';
            window.location.href = 'index.html';
        }
    }
}

