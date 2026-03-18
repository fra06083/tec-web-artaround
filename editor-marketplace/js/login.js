document.addEventListener('alpine:init', () => {
    Alpine.data('appArtAround', () => ({
        login: null, // settato su nullo (dovremo mettere che prende da api)
        vistaAttuale: 'marketplace', // Gestisce quale "pagina" mostrare
        formLogin: {
            username: '',
            password: ''
        },

        visiteMarketplace: [], // prende info da api di express in futuro

        async eseguiLogin() {
            try {
                const value = {
                    name: this.formLogin.username,
                    password: this.formLogin.password
                }
                const result = await fetch('/api/login', {
                    method: "POST",
                    body: JSON.stringify(value), // we need to give to body json value of {name, password}
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
                const data = await result.json(); // prende risultato da richiesta post
                console.log("richiesta post su api/login");
                if (!result.ok) {
                    throw new Error(data.message);
                }
                this.login = this.formLogin.username;
                this.vistaAttuale = "marketplace";
                this.formLogin.password = ""; // just to be sure to reset password
                localStorage.setItem('token', data.token); // we can use this to be sure if a user is logged in.
            } catch (error) {
                // Gestione di eventuali errori di rete o del server
                console.error('Errore durante la richiesta di login:', error);
            }
        },

        eseguiLogout() {
            this.login = null;
            this.formLogin.username = '';
            this.formLogin.password = '';
            this.vistaAttuale = 'marketplace';
            localStorage.removeItem('token'); // we need to clear that token if logged out
        }
    }))
});
