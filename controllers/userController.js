const crypto = require("crypto");
const { randomUUID } = crypto;
const util = require("util");
const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");
const { userSchema, logonSchema } = require("../validation/userSchema");
const prisma = require("../db/prisma");

const scrypt = util.promisify(crypto.scrypt);

const cookieFlags = (req) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only when HTTPS is available
    sameSite: "Strict",
  };
};

const setJwtCookie = (req, res, user) => {
  // Sign JWT
  const payload = { id: user.id, csrfToken: randomUUID() };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }); // 1 hour expiration
  // Set cookie.  Note that the cookie flags have to be different in production and in test.
  res.cookie("jwt", token, { ...cookieFlags(req), maxAge: 3600000 }); // 1 hour expiration
  return payload.csrfToken; // this is needed in the body returned by logon() or register()
};

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

  let isPerson = false;
  if (req.body.recaptchaToken) {
    const token = req.body.recaptchaToken;
    const params = new URLSearchParams();
    params.append("secret", process.env.RECAPTCHA_SECRET);
    params.append("response", token);
    params.append("remoteip", req.ip);
    const response = await fetch(
      // might throw an error that would cause a 500 from the error handler
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        body: params.toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    const data = await response.json();
    if (data.success) isPerson = true;
    delete req.body.recaptchaToken;
  } else if (
    process.env.RECAPTCHA_BYPASS &&
    req.get("X-Recaptcha-Test") === process.env.RECAPTCHA_BYPASS
  ) {
    // might be a test environment
    isPerson = true;
  }
  if (!isPerson) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Bot verification failed. Please complete the reCAPTCHA." });
  }

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

  try {
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { name, email, hashedPassword },
        select: { id: true, name: true, email: true, createdAt: true },
      });

      const welcomeTaskData = [
        { title: "Complete your profile", userId: newUser.id, priority: "medium" },
        { title: "Add your first task", userId: newUser.id, priority: "high" },
        { title: "Explore the app", userId: newUser.id, priority: "low" },
      ];
      await tx.task.createMany({ data: welcomeTaskData });

      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: { in: welcomeTaskData.map((t) => t.title) },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true,
        },
      });

      return { user: newUser, welcomeTasks };
    });

    const csrfToken = setJwtCookie(req, res, result.user);

    res.status(201).json({
      user: result.user,
      csrfToken,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success",
    });
    return;
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Email already registered" });
    }
    return next(err);
  }
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
    user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, hashedPassword: true },
    });
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

  const csrfToken = setJwtCookie(req, res, user);

  res.status(200).json({
    name: user.name,
    email: user.email,
    csrfToken,
  });
}

/**
 * Logs out the current user
 * @param {*} req
 * @param {*} res
 */
function logoff(req, res) {
  res.clearCookie("jwt", cookieFlags(req));
  res.status(200).send();
}

/**
 * Shows a user along with their 5 most recent incomplete tasks (eager loading)
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function show(req, res, next) {
  const userId = parseInt(req.params?.id, 10);

  if (Number.isNaN(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  let user = null;
  try {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        Task: {
          where: { isCompleted: false },
          select: {
            id: true,
            title: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
  } catch (e) {
    return next(e);
  }

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json(user);
}

module.exports = {
  register,
  logon,
  logoff,
  show,
};
