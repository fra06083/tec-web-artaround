const mongoose = require('mongoose');
// STRUTTURA DI UN ADMIN
const adminSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  }
});

module.exports = mongoose.model('Admin', adminSchema);
