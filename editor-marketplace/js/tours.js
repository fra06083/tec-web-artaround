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
                const musRes = await fetch('/admin/museums');
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
                const res = await fetch(`/admin/tours?museum_id=${this.selectedMuseum}`);
                this.availableTours = await res.json();
            }
        },

        get canProceed() {
            if (this.mode === 'create') return this.selectedMuseum !== '';
            return this.selectedTourId !== '';
        },

        async goToForm() {
            if (this.mode === 'edit') {
                const res = await fetch(`/admin/tours/${this.selectedTourId}`);
                this.tour = await res.json();
            } else {
                this.tour.museum_id = this.selectedMuseum;
            }
            this.step = 'form';
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
