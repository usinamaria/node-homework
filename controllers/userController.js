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

    global.user_id = result.user.id;

    res.status(201).json({
      user: result.user,
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
