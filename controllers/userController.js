const crypto = require("crypto");
const util = require("util");
const { userSchema, logonSchema } = require("../validation/userSchema");
const prisma = require("../db/prisma");

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

  const hashedPassword = await hashPassword(value.password);
  const { name, email } = value;

  let user = null;
  try {
    user = await prisma.user.create({
      data: { name, email, hashedPassword },
      select: { name: true, email: true, id: true },
    });
  } catch (err) {
    if (err.name === "PrismaClientKnownRequestError" && err.code === "P2002") {
      return res.status(400).json({ message: "Email is already registered" });
    }
    return next(err);
  }

  global.user_id = user.id;

  res.status(201).json({
    name: user.name,
    email: user.email,
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

  const email = value.email.toLowerCase();

  let user = null;
  try {
    user = await prisma.user.findUnique({ where: { email } });
  } catch (e) {
    return next(e);
  }

  if (!user) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const goodCredentials = await comparePassword(
    value.password,
    user.hashedPassword,
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
