const mongoose = require('mongoose');
// STRUTTURA DI UN ADMIN
const loginSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    permissions: {
        type: String,
        enum: ["visitatore", 'autore', "admin"],
        required: true
    },
});

module.exports = mongoose.model('login', loginSchema);
