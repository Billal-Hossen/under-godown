// const { ApiError } = require("@paypal/paypal-server-sdk")
// const jwt = require("jsonwebtoken")
// const redis = require("../redis/redisClient")
// const { UserModel } = require("../data/models/user")

// const authMiddleware = async (req, res, next) => {
//   try {
//     const token = req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "")
// // console.log(token, "token from auth middleware");
//     if (!token) {
//       throw new ApiError(401, "Unautorized request")
//     }
//     // const isBlacklisted = await isTokenBlacklisted(token);
//     // if (isBlacklisted) {
//     //     throw new ApiError(401, "Token has been blacklisted");
//     // }

//     const decodeToken = jwt=t.verify(token, process.env.ACCESS_TOKEN_SCERET )

//     const _id = decodeToken.id
//     const user = await UserModel.findById(_id).populate({ path: "role", select: "roleName" })
//     console.log("user data=>>>>>>>>>>>>>>>>>", user);
//     if (!user) {
//       throw new ApiError(401, "Invalid access token")
//     }
//        if (!user || !user.isActive) return res.status(401).json({ message: 'Unauthorized' });
//     req.user = {
//       ...user,
//         email: user.email,
//         role: user.role.roleName,
//         id: user.id
//     }
//     console.log("req.user from auth middleware", req.user);
     
//     next()
//   } catch (error) {
//     throw new ApiError(401, error?.message || "Invalid token")
//   }
// }

async function isTokenBlacklisted(token) {
    const result = await redis.get(`blacklisted:${token}`);
    return result !== null; 
}


require("dotenv").config()
const jwt = require("jsonwebtoken")
const redis = require("../redis/redisClient")
const { UserModel } = require("../data/models/user");
const ApiError = require("../utils/ApiError");

const authMiddleware = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ message: "Unauthorized request" })
    }
        const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
        throw new ApiError(401, "Token has been blacklisted");
    }

    console.log("==========================", token, process.env.ACCESS_TOKEN_SCERET)
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SCERET)
    console.log(decoded, "decoded token")
    const user = await UserModel.findById(decoded.id).populate({
      path: "role",
      select: "roleName",
    })

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role.roleName,
    }

    next()
  } catch (error) {
    return res.status(401).json({ message: error.message || "Invalid token" })
  }
}

module.exports = authMiddleware;