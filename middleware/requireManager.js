const { StatusCodes } = require("http-status-codes");

module.exports = (req, res, next) => {
  const roles = req.user?.roles;
  const roleList =
    typeof roles === "string"
      ? roles.split(",").map((role) => role.trim())
      : [];

  if (!roleList.includes("manager")) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "This action requires the manager role." });
  }
  next();
};
