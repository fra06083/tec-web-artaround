// This script handles the early dark-mode application and the global loader logic.
// It is intentionally loaded as a blocking script in the <head> to prevent FOUC (Flash of Unstyled Content).

// Apply dark mode immediately if set in localStorage
if (localStorage.getItem('artaround_darkmode') === 'true') {
    document.documentElement.classList.add('dark-mode');
}

// Track when the loader was created to ensure it's visible for a minimum duration
const loaderStartTime = Date.now();

// Global function to hide the loader smoothly
window.hideMainLoader = function() {
    const elapsed = Date.now() - loaderStartTime;
    const delay = Math.max(0, 800 - elapsed);
    
    setTimeout(() => {
        const loader = document.getElementById('mainLoader');
        if (loader && !loader.classList.contains('fade-out')) {
            loader.classList.add('fade-out');
            
            // Completely remove the loader from the DOM after the CSS transition finishes (0.6s)
            setTimeout(() => {
                if (loader.parentNode) {
                    loader.remove();
                }
            }, 600);
        }
    }, delay);
};
