const jwt = require("jsonwebtoken");

const auth_check_middleware = (req, res, next) => {
  try {
    let token = req.headers.authorization;
    token = token?.split(" ")[1];

    if (!token) {
      return res
        .status(403)
        .json({ msg: "Token missing. Please login first." });
    }

    const isVerified = jwt.verify(token, "secret_key");

    if (isVerified?.email) {
      next();
    } else {
      res.status(500).json({
        msg: "Internal server problem",
      });
    }
  } catch (error) {
    res.status(403).json({
      msg: "Invalid or expired token. Please login again.",
    });
    console.log(error);
  }
};

module.exports = { auth_check_middleware };
