const mongoose = require('mongoose');

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
    propic: {
        type: String,
        default: ""
    },
    permissions: {
        type: String,
        enum: ["visitatore", "editor", "docente", "admin"],
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
