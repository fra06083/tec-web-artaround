const express = require('express');
const router = express.Router();
const { visit, item } = require('../models/museums.js'); // requiring models
const login = require('../models/admin.js');

router.get('/stats', async (req, res) => {
    try {
        const publishedTours = await visit.countDocuments();

        const totalUsers = await login.countDocuments();

        res.json({
            publishedTours: publishedTours,
            totalDownloads: 0, // TODO: cosa si puo` mettere qui?
            activeUsers: totalUsers,
            serverStatus: "Online"
        });
    } catch (error) {
        res.status(500).json({ error: "Errore nel recupero dei dati" });
    }
});
router.get('/tours', async (req, res) => {
    try {
        // find all tours
        const tours = await visit.find().populate('museum_id');
        res.json(tours);
    } catch (error) {
        res.status(500).json({ error: "Errore nel caricamento dei tour" });
    }
});
module.exports = router;
