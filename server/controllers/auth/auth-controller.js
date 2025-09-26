const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const ApiError = require("../../utils/ApiError");

//register
const registerUser = async (req, res, next) => {
  const { userName, email, password } = req.body;
  try {
      if (!userName || !email || !password) throw new ApiError(400, "All fields are required",[{ field: "userName/email/password", message: "All fields are required" }]);

    const checkUser = await User.findOne({ email });
    if (checkUser)
      throw new ApiError(409, "User already exists! Please login",[{ field: "email", message: "User already exists! Please login" }]);

    const hashPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      userName,
      email,
      password: hashPassword,
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
      throw new ApiError(400, "Email and password are required",[{ field: "email/password", message: "Email and password are required" }]);
    }
    const checkUser = await User.findOne({ email });
    if (!checkUser) {
      throw new ApiError(404, "User doesn't exist! Please register first",[{ field: "email", message: "User doesn't exist! Please register first" }]);
    }
    const checkPasswordMatch = await bcrypt.compare(password, checkUser.password);
    if (!checkPasswordMatch) {
      throw new ApiError(400, "Incorrect password! Please try again",[{ field: "password", message: "Incorrect password! Please try again" }]);
    }

    const token = jwt.sign(
      {
        id: checkUser._id,
        role: checkUser.role,
        email: checkUser.email,
        userName: checkUser.userName,
      },
      "CLIENT_SECRET_KEY",
      { expiresIn: "60m" }
    );

    res.cookie("token", token, { httpOnly: true, secure: false }).json({
      success: true,
      message: "Logged in successfully",
      user: {
        email: checkUser.email,
        role: checkUser.role,
        id: checkUser._id,
        userName: checkUser.userName,
      },
    });
  } catch (e) {
    next(e);
  }
};

//logout

const logoutUser = (req, res) => {
  res.clearCookie("token").json({
    success: true,
    message: "Logged out successfully!",
  });
};



module.exports = { registerUser, loginUser, logoutUser };
