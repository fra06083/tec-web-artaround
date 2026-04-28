const { visit } = require('../models/museums.js'); // used for accessing Visit data
const login = require('../models/admin.js');       // used for accessing User data
const path = require('path');                      // used for handling file paths

module.exports = {
    // used for sending dashboard statistics (JSON)
    getStats: async (req, res) => {
        try {
            const publishedTours = await visit.countDocuments();
            const totalUsers = await login.countDocuments();

            res.json({
                publishedTours,
                activeUsers: totalUsers,
                serverStatus: "Online"
            });
        } catch (error) {
            res.status(500).json({ error: "Data retrieval failed" });
        }
    },

    // used for sending all tours list (JSON)
    getAllTours: async (req, res) => {
        try {
            const tours = await visit.find().populate('museum_id');
            res.json(tours);
        } catch (error) {
            res.status(500).json({ error: "Tours loading failed" });
        }
    },

    // used for serving the protected HTML file
    serveDashboard: (req, res) => {
        // sends the physical file from the "views" folder
        res.sendFile(path.join(__dirname, '../views/editor/dashboard.html'));
    },
    serveMuseums: (req, res) => {
        // sends the physical file from the "views" folder
        res.sendFile(path.join(__dirname, '../views/editor/museum.html'));
    },
    serveArtworks: (req, res) => {
        // sends physical file from the views folder
        res.sendFile(path.join(__dirname, "../views/editor/artworks.html"));
    },
    serveTours: (req, res) => {
        // sends the physical file from the "views" folder
        res.sendFile(path.join(__dirname, '../views/editor/tours.html'));
    },
    serveUsersManagement: (req, res) => {
        // Nota: adminController è in 'controllers/', quindi serve '../views/...'
        res.sendFile(path.join(__dirname, '../views/editor/users.html'));
    }

};
