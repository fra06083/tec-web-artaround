const mongoose = require('mongoose');
// STRUTTURA DI UN ADMIN/USER
const userSchema = new mongoose.Schema({
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
    museums: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'museum'
    }],
    purchased_visits: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'visit'
    }]
});

module.exports = mongoose.model('user', userSchema, 'logins');
