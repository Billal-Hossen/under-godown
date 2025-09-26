const cors = require("cors");
const app = require("./app")

const connectDB = require("./database/dbConnection.js")

const main = async () => {
    try {
        // create a database connection
        await connectDB()

        // cors configuration
        app.use(
            cors({
                origin: "http://localhost:5173",
                methods: ["GET", "POST", "DELETE", "PUT"],
                allowedHeaders: [
                    "Content-Type",
                    "Authorization",
                    "Cache-Control",
                    "Expires",
                    "Pragma",
                ],
                credentials: true,
            })
        );
        

        app.listen(process.env.PORT, () => {
            console.log(`App listing on http://localhost:${process.env.PORT}`.green)
        })
    }
    catch (error) {
        console.log("Database connection error!!", error)
    }
}
main()