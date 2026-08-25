// applica il tema scuro subito prima del render dell'head per evitare il flash
if (localStorage.getItem('artaround_darkmode') === 'true') {
    document.documentElement.classList.add('dark-mode');
}

// calcola il tempo minimo di permanenza del loader (800ms)
const loaderStartTime = Date.now();

window.hideMainLoader = function() {
    const elapsed = Date.now() - loaderStartTime;
    const delay = Math.max(0, 800 - elapsed);
    
    setTimeout(() => {
        const loader = document.getElementById('mainLoader');
        if (loader && !loader.classList.contains('fade-out')) {
            loader.classList.add('fade-out');
            
            setTimeout(() => {
                if (loader.parentNode) {
                    loader.remove();
                }
            }, 600);
        }
    }, delay);
};
