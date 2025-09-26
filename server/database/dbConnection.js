
require('dotenv').config();
require("colors");
const mongoose = require("mongoose");


const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${process.env.DB_NAME}`, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`Database connected successfully!! DB HOST: ${connectionInstance.connection.host}`.yellow.underline)

    } catch (error) {
        console.log("Databse connection Failed!! :".red.underline, error)
        process.exit(1)
    }
}
module.exports = connectDB