const { ApiError } = require("@paypal/paypal-server-sdk")
const User = require("../models/User")
const jwt = require("jsonwebtoken")
const redis = require("../redis/redisClient")

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "")
console.log(token, "token from auth middleware");
    if (!token) {
      throw new ApiError(401, "Unautorized request")
    }
    console.log(process.env.ACCESS_TOKEN_SCERECT, "process.env.ACCESS_TOKEN_SCERECT");
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
        throw new ApiError(401, "Token has been blacklisted");
    }
    const algorithm = 'HS256'
    const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SCERECT )
    console.log(decodeToken, "decodeToken");
    const _id = decodeToken.id
    const user = await User.findById(_id)
    if (!user) {
      throw new ApiError(401, "Invalid access token")
    }
    req.user = user
    next()
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid token")
  }
}

async function isTokenBlacklisted(token) {
    const result = await redis.get(`blacklisted:${token}`);
    return result !== null; 
}

module.exports = authMiddleware;