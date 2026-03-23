function homeApp() {
    return {
        isLoggedIn: false, // Strictly false on start
        username: '',

        async init() {
            const token = localStorage.getItem('artaround_token');
            if (!token) {
                this.isLoggedIn = false;
                return;
            }

            try {
                // Using your specified endpoint: /api/check
                const response = await fetch('/api/check', {
                    method: 'GET',
                    headers: { 'Authorization': token }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.username = data.user.name;
                    this.isLoggedIn = true; // Set to true only after server check
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error("Auth failed:", error);
                // If network fails, we don't logout to avoid clearing storage
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

