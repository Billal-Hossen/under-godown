require('dotenv').config()
const cors = require("cors");
const express = require("express");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const authRouter = require("./routes/auth/auth-routes");
const adminProductsRouter = require("./routes/admin/products-routes");
const adminOrderRouter = require("./routes/admin/order-routes");

const shopProductsRouter = require("./routes/shop/products-routes");
const shopCartRouter = require("./routes/shop/cart-routes");
const shopAddressRouter = require("./routes/shop/address-routes");
const shopOrderRouter = require("./routes/shop/order-routes");
const shopSearchRouter = require("./routes/shop/search-routes");
const shopReviewRouter = require("./routes/shop/review-routes");

const commonFeatureRouter = require("./routes/common/feature-routes");
const globalErrorHandler = require('./middlewares/globalErrorHandle');


const app = express();
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
app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: true, limit: '16kb' }))
app.use(cookieParser());
app.use(morgan('dev'))


// Define routes
app.use("/api/auth", authRouter);
app.use("/api/admin/products", adminProductsRouter);
app.use("/api/admin/orders", adminOrderRouter);

app.use("/api/shop/products", shopProductsRouter);
app.use("/api/shop/cart", shopCartRouter);
app.use("/api/shop/address", shopAddressRouter);
// app.use("/api/shop/order", shopOrderRouter);
app.use("/api/shop/search", shopSearchRouter);
app.use("/api/shop/review", shopReviewRouter);

app.use("/api/common/feature", commonFeatureRouter);
// Global Error Handling Middleware
app.use(globalErrorHandler)



module.exports = app;