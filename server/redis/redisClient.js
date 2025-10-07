const Redis = require("ioredis");

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
});   

// redisClient.on("error", (err) => console.error("Redis Client Error", err));

// (async () => {
//   await redisClient.connect();
//   console.log("✅ Redis Connected");
// })();


module.exports = redisClient;