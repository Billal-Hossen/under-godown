const { z } = require("zod");
const ApiError = require("../../utils/ApiError");
const blackListToken = require("../../utils/tokenBlackList");
const { UserModel } = require("../../data/models/user");
const { RefreshTokenModel } = require("../../data/models/refresh-token");
const { hashString, compareHash, sha256 } = require("../../utils/crypto");
const { parseDuration, generateToken } = require("../../utils/jwt");
const { RoleModel } = require("../../data/models/role");


const registerSchema = z.object({
  userName: z.string().min(3).max(30, { message: "Username must be required and between 3 and 30 characters" }),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
});

//register
const registerUser = async (req, res, next) => {

  try {

    const { userName, email, password, phone } = req.body;
    console.log(userName, email, password);
    if (!userName || !email || !password) throw new ApiError(400, "All fields are required", [{ field: "userName/email/password", message: "All fields are required" }]);

    const checkUser = await UserModel.findOne({ email });
    if (checkUser)
      throw new ApiError(409, "User already exists! Please login", [{ field: "email", message: "User already exists! Please login" }]);

    const hashPassword = hashString(password);
    const newUser = new UserModel({
      userName,
      email,
      password: hashPassword,
      phone
    });

    await newUser.save();
    res.status(200).json({
      success: true,
      message: "Registration successful",
    });
  } catch (e) {
    next(e);
  }
};

//login


const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new ApiError(400, "Email and password are required", [{ field: "email/password", message: "Email and password are required" }]);
    }
    const checkUser = await UserModel.findOne({ email })
      .populate({
        path: "role",
        select: "roleName"
      });
console.log(checkUser.role.roleName)
    if (!checkUser) {
      throw new ApiError(404, "User doesn't exist! Please register first", [{ field: "email", message: "User doesn't exist! Please register first" }]);
    }
    const ok = compareHash(password, checkUser.password);
    if (!ok) {
      throw new ApiError(400, "Incorrect password! Please try again", [{ field: "password", message: "Incorrect password! Please try again" }]);
    }
    const payload = { id: checkUser._id,userName: checkUser.userName, role: checkUser.role.roleName, email: checkUser.email, userName: checkUser.userName };
    console.log("payload", payload);
    const accessToken = generateToken(payload, process.env.ACCESS_TOKEN_SCERET, process.env.JWT_ACCESS_EXPIRES);
    const refresh = generateToken({ uid: checkUser.id, type: checkUser.userType }, process.env.REFRESH_TOKEN_SCERET, process.env.JWT_REFRESH_EXPIRES);
    // store refresh hash
    const tokenHash = sha256(refresh);
    const expiresAt = new Date(Date.now() + parseDuration(process.env.JWT_REFRESH_EXPIRES || '15d'));
    await RefreshTokenModel.create({
      userId: checkUser._id,
      tokenHash,
      expiresAt,
      ip: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    res.cookie('refresh_token', refresh, {
      httpOnly: true,
      secure: false,
      // secure: true, // requires HTTPS in prod
      //sameSite: isProd ? 'none' : 'lax',
      sameSite: 'lax',
      maxAge: expiresAt, // 15m
      // domain: cookieDomain,
      // domain: undefined,
      // path: '/api/v1/auth', // only auth routes will send it automatically
    });

    res.cookie("token", accessToken, { httpOnly: true, secure: false }).json({
      success: true,
      message: "Logged in successfully",
      user: {
        email: checkUser.email,
        role: checkUser.role.roleName,
        id: checkUser._id,
        userName: checkUser.userName,
      },
    });
  } catch (e) {
    next(e);
  }
};


const logoutUser = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      throw new ApiError(400, "No token found", [{ field: "token", message: "No token found" }]);
    }
    // blacklist + revoke

    const decoded = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString(),
    );
    const expSeconds = decoded.exp - Math.floor(Date.now() / 1000);
    await blackListToken(true, token, expSeconds);

    // Clear the token cookie

    res.clearCookie("refresh_token");
    res.clearCookie("token").json({
      success: true,
      message: "Logged out successfully!",
    });
  } catch (error) {
    console.error("Logout error:", error);
    next(error);
  }
};



module.exports = { registerUser, loginUser, logoutUser };
