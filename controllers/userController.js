const crypto = require("crypto");
const util = require("util");
const { userSchema, logonSchema } = require("../validation/userSchema");
const pool = require("../db/pg-pool");

const scrypt = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  if (typeof storedHash !== "string" || !storedHash.includes(":")) {
    return false;
  }

  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);

  if (keyBuffer.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

/**
 * Registers a new user
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function register(req, res, next) {
  if (!req.body) req.body = {};

  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  let user = null;
  value.hashed_password = await hashPassword(value.password);

  try {
    user = await pool.query(
      `INSERT INTO users (email, name, hashed_password)
      VALUES ($1, $2, $3) RETURNING id, email, name`,
      [value.email, value.name, value.hashed_password],
    );
  } catch (e) {
    if (e.code === "23505") {
      return res.status(400).json({ message: "Email is already registered" });
    }
    return next(e);
  }

  global.user_id = user.rows[0].id;

  res.status(201).json({
    name: user.rows[0].name,
    email: user.rows[0].email,
  });
}

/**
 * Logs in an existing user
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
async function logon(req, res, next) {
  if (!req.body) req.body = {};

  const { error, value } = logonSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  let result = null;
  try {
    result = await pool.query("SELECT * FROM users WHERE email = $1", [
      value.email,
    ]);
  } catch (e) {
    return next(e);
  }

  if (result.rows.length === 0) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const user = result.rows[0];

  const goodCredentials = await comparePassword(
    value.password,
    user.hashed_password,
  );

  if (!goodCredentials) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  global.user_id = user.id;

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
