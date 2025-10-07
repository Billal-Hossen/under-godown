const cors = require("cors");
const app = require("./app")

const connectDB = require("./database/dbConnection.js");
const { startCartExpiryWorker } = require("./controllers/shop/cart-controller.js");

const main = async () => {
    try {
        startCartExpiryWorker({ intervalMs: 5000, batchSize: 100 });
        // create a database connection
        await connectDB()
        app.listen(process.env.PORT, () => {
            console.log(`App listing on http://localhost:${process.env.PORT}`.green)
        })
    }
    catch (error) {
        console.log("Database connection error!!", error)
    }
}
main()