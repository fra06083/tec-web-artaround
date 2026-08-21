const { visit } = require('../models/museums.js');
const User = require('../models/user.js');
const path = require('path');

module.exports = {
    getStats: async (req, res) => {
        try {
            const [publishedTours, totalUsers] = await Promise.all([
                visit.countDocuments(),
                User.countDocuments()
            ]);

            res.json({
                publishedTours,
                activeUsers: totalUsers,
                serverStatus: "Online"
            });
        } catch (error) {
            res.status(500).json({ error: "Data retrieval failed" });
        }
    },

    getAllTours: async (req, res) => {
        try {
            const tours = await visit.find().populate('museum_id');
            res.json(tours);
        } catch (error) {
            res.status(500).json({ error: "Tours loading failed" });
        }
    },

    serveDashboard: (req, res) => {
        res.sendFile(path.join(__dirname, '../views/editor/dashboard.html'));
    },
    serveMuseums: (req, res) => {
        res.sendFile(path.join(__dirname, '../views/editor/museum.html'));
    },
    serveArtworks: (req, res) => {
        res.sendFile(path.join(__dirname, "../views/editor/artworks.html"));
    },
    serveTours: (req, res) => {
        res.sendFile(path.join(__dirname, '../views/editor/tours.html'));
    },
    serveUsersManagement: (req, res) => {
        res.sendFile(path.join(__dirname, '../views/editor/users.html'));
    },
    serveImporter: (req, res) => {
        res.sendFile(path.join(__dirname, '../views/editor/import.html'));
    }
};
