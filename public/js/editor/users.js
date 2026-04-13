document.addEventListener('alpine:init', () => {
    Alpine.data('usersManager', () => ({
        isReady: false,
        users: [],
        username: '',

        async init() {
            const token = localStorage.getItem('artaround_token');
            if (!token) return window.location.href = '../index.html';

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

                // 2. take all editors
                const usersRes = await fetch('/admin/users', {
                    headers: { 'Authorization': token }
                });
                this.users = await usersRes.json();

            } catch (error) {
                console.error("Errore sicurezza:", error);
            } finally {
                this.isReady = true;
            }
        },

        logout() {
            localStorage.removeItem('artaround_token');
            window.location.href = '../index.html';
        }
    }));
});
