const mongoose = require('mongoose');
const { museum, visit } = require('./models/museums.js');
const User = require('./models/user.js');
require('dotenv').config({ path: '.env' });

const dbUser = process.env.MONGO_USER;
const dbPwd = process.env.MONGO_PWD;
const dbHost = process.env.MONGO_HOST;
const PORT = process.env.PORT || 27017;
const dbName = "musei";

const MONGODB_URI = `mongodb://${dbUser}:${dbPwd}@${dbHost}:${PORT}/${dbName}?authSource=admin&writeConcern=majority`;

mongoose.connect(MONGODB_URI).then(async () => {
    const users = await User.find().populate({
        path: 'purchased_visits',
        populate: { path: 'museum_id', select: 'museum province image' }
    });
    
    users.forEach(u => {
        if(u.purchased_visits && u.purchased_visits.length > 0) {
            u.purchased_visits.forEach(v => {
                if(v.name.includes("TEST")) {
                    console.log("Found visit:", v.name);
                    console.log("Museum ID:", JSON.stringify(v.museum_id));
                }
            });
        }
    });
    process.exit(0);
});
