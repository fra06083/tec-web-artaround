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
        darkMode: false,

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
                    this.permissions = data.user.permissions;
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
            this.permissions = '';
            window.location.href = 'index.html';
        }
    }
}
