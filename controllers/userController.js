const crypto = require("crypto");
const util = require("util");
const { userSchema, logonSchema } = require("../validation/userSchema");

const scrypt = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

/**
 * Registers a new user
 * @param {*} req
 * @param {*} res
 */
async function register(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const hashedPassword = await hashPassword(value.password);

  const newUser = {
    email: value.email,
    name: value.name,
    hashedPassword,
  };

  global.users.push(newUser);
  global.user_id = newUser;

  res.status(201).json({
    name: newUser.name,
    email: newUser.email,
  });
}

/**
 * Logs in an existing user
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function logon(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = logonSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const user = global.users.find((u) => u.email === value.email);

  const goodCredentials =
    user && (await comparePassword(value.password, user.hashedPassword));

  if (!goodCredentials) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  global.user_id = user;

  res.status(200).json({
    name: user.name,
    email: user.email,
  });
}

/**
 * Logs out the current user
 * @param {*} req
 * @param {*} res
 */
function logoff(req, res) {
  global.user_id = null;
  res.status(200).send();
}

module.exports = {
  register,
  logon,
  logoff,
};
