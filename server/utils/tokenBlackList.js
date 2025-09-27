const redis = require("../redis/redisClient");
async function blackListToken(isClient, token, expirationInSeconds) {
    try {
        await redis.set(token, `blacklisted:${token}`, 'EX', expirationInSeconds);
        console.log(`Token blacklisted successfully: ${token}`, expirationInSeconds);
    } catch (error) {
        console.error("Error blacklisting token:", error);
        throw error;
    }

}
module.exports = blackListToken;