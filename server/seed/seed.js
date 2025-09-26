const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const usersData = require('./users.json');
require('colors');

async function seedDatabase() {
    try {
        await mongoose.connect(`${process.env.MONGO_URI}/${process.env.DB_NAME}`, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("MongoDB connected for seeding".yellow.underline);
        // Seed users
        await createUsers();
        mongoose.connection.close();
        console.log("Database seeding completed and connection closed".yellow.underline);
    } catch (error) {
        console.error("Error connecting to MongoDB or seeding data:".red, error);
    }
}

async function createUsers() {
    try {
        await User.deleteMany({});
        await User.insertMany(usersData);
        console.log("Users data seeded successfully".green);
    } catch (error) {
        console.error("Error seeding users data:".red, error);
    }

}

seedDatabase();