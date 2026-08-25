(function (global) {
    'use strict';

    function normalizeCoordinate(val) {
        const num = parseFloat(val);
        if (isNaN(num)) return 0;
        const normalized = num > 1 ? num / 100 : num;
        return Math.max(0, Math.min(1, normalized));
    }

    function normalizePin(pin) {
        if (!pin || typeof pin !== 'object') return pin;
        return {
            ...pin,
            x: normalizeCoordinate(pin.x),
            y: normalizeCoordinate(pin.y)
        };
    }

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
