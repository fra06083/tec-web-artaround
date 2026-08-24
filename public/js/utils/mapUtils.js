/**
 * ArtAround - Map & Pin Utility Module
 * Modulo centralizzato per la normalizzazione ed il posizionamento dinamico delle mappe e dei pin.
 */
(function (global) {
    'use strict';

    /**
     * Normalizza una coordinata (X o Y) assicurando che sia un valore decimale compreso in [0, 1].
     * Convertitore automatico per percentuali (0..100) e stringhe numeriche.
     * 
     * @param {number|string} val - Valore di coordinata grezzo.
     * @returns {number} Coordinata normalizzata in [0, 1].
     */
    function normalizeCoordinate(val) {
        const num = parseFloat(val);
        if (isNaN(num)) return 0;
        const normalized = num > 1 ? num / 100 : num;
        return Math.max(0, Math.min(1, normalized));
    }

    /**
     * Normalizza un oggetto pin/sala (restituisce un nuovo oggetto immutabile con x e y normalizzati).
     * 
     * @param {Object} pin - Oggetto contenente x, y e metadati.
     * @returns {Object} Pin con coordinate normalizzate.
     */
    function normalizePin(pin) {
        if (!pin || typeof pin !== 'object') return pin;
        return {
            ...pin,
            x: normalizeCoordinate(pin.x),
            y: normalizeCoordinate(pin.y)
        };
    }

    /**
     * Normalizza la struttura 'mappa' del museo (piante, sale, poi).
     * 
     * @param {Object} museumOrMappa - Oggetto museo o direttamente l'oggetto mappa.
     * @returns {Object} Mappa pulita con sale normalizzate.
     */
    function normalizeMappaData(museumOrMappa) {
        if (!museumOrMappa) return { piante: [], sale: [], poi: [] };
        const rawMappa = museumOrMappa.mappa || museumOrMappa;
        
        return {
            piante: Array.isArray(rawMappa.piante) ? rawMappa.piante.map(p => ({ ...p })) : [],
            sale: Array.isArray(rawMappa.sale) ? rawMappa.sale.map(normalizePin) : [],
            poi: Array.isArray(rawMappa.poi) ? rawMappa.poi.map(p => ({ ...p })) : []
        };
    }

    const MapUtils = {
        normalizeCoordinate,
        normalizePin,
        normalizeMappaData
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MapUtils;
    } else {
        global.MapUtils = MapUtils;
    }
})(typeof window !== 'undefined' ? window : globalThis);
