document.addEventListener('alpine:init', () => {
    Alpine.data('toursManager', () => ({
        // State
        isReady: false,
        step: 'choice', // choice, selection, form
        mode: 'create', // create, edit
        username: '',

        // Data
        museums: [],
        availableTours: [],
        selectedMuseum: '',
        selectedTourId: '',

        // Form Model
        tour: { name: '', museum_id: '', description: '', logistic_info: [''], items: [] },

        async init() {
            const token = localStorage.getItem('artaround_token');
            if (!token) return window.location.href = '../index.html';

            try {
                // Auth Check
                const authRes = await fetch('/api/check', {
                    method: 'POST',
                    headers: { 'Authorization': token }
                });
                const authData = await authRes.json();
                if (!authRes.ok) throw new Error();
                this.username = authData.user.name;

                // Load Museums
                const musRes = await fetch('/api/museums');
                this.museums = await musRes.json();

            } catch (e) {
                console.error("Auth o caricamento fallito");
            } finally {
                this.isReady = true;
            }
        },

        setMode(m) {
            this.mode = m;
            this.step = 'selection';
            this.resetForm();
        },

        async onMuseumChange() {
            if (this.mode === 'edit' && this.selectedMuseum) {
                const res = await fetch(`/api/visite?museum_id=${this.selectedMuseum}`);
                this.availableTours = await res.json();
            }
        },

        get canProceed() {
            if (this.mode === 'create') return this.selectedMuseum !== '';
            return this.selectedTourId !== '';
        },

        async goToForm() {
            if (this.mode === 'edit') {
                const res = await fetch(`/api/visite/${this.selectedTourId}`);
                this.tour = await res.json();
            } else {
                this.tour.museum_id = this.selectedMuseum;
            }
            this.step = 'form';
        },

        async saveTour() {
            const token = localStorage.getItem('artaround_token');
            try {
                const isEdit = this.mode === 'edit';
                const url = isEdit ? `/api/visite/${this.tour._id}` : '/api/visite';
                const method = isEdit ? 'PUT' : 'POST';

                const res = await fetch(url, {
                    method,
                    headers: {
                        'Authorization': token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.tour)
                });

                if (!res.ok) throw new Error();

                this.step = 'choice';
                this.resetForm();
            } catch (e) {
                console.error("Salvataggio tour fallito");
            }
        },

        resetForm() {
            this.selectedMuseum = '';
            this.selectedTourId = '';
            this.tour = { name: '', museum_id: '', description: '', logistic_info: [''], items: [] };
        },

        logout() {
            localStorage.removeItem('artaround_token');
            window.location.href = '../index.html';
        }
    }));
});
