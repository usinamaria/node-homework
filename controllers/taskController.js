const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const prisma = require("../db/prisma");

function parseTaskId(rawId) {
  if (!/^\d+$/.test(rawId ?? "")) {
    return NaN;
  }
  return Number(rawId);
}

/**
 * Creates a new task owned by the logged-in user
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function create(req, res, next) {
  if (!req.body) req.body = {};

  const { error, value } = taskSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  let task = null;
  try {
    task = await prisma.task.create({
      data: {
        title: value.title,
        isCompleted: value.isCompleted,
        userId: global.user_id,
      },
      select: { id: true, title: true, isCompleted: true },
    });
  } catch (e) {
    return next(e);
  }

  res.status(201).json(task);
}

/**
 * Lists the logged-in user's tasks
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function index(req, res, next) {
  let tasks = null;
  try {
    tasks = await prisma.task.findMany({
      where: {
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true },
    });
  } catch (e) {
    return next(e);
  }

  if (tasks.length === 0) {
    return res.status(404).json({ message: "No tasks found for user" });
  }

  res.status(200).json(tasks);
}

/**
 * Shows a single task owned by the logged-in user
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function show(req, res, next) {
  const taskId = parseTaskId(req.params?.id);
  if (Number.isNaN(taskId)) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  let task = null;
  try {
    task = await prisma.task.findUnique({
      where: {
        id: taskId,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true },
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    }
    return next(err);
  }

  if (!task) {
    return res.status(404).json({ message: "The task was not found." });
  }

  res.status(200).json(task);
}

/**
 * Updates a task owned by the logged-in user
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function update(req, res, next) {
  if (!req.body) req.body = {};

  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const taskId = parseTaskId(req.params?.id);
  if (Number.isNaN(taskId)) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  let updatedTask = null;
  try {
    updatedTask = await prisma.task.update({
      data: value,
      where: {
        id: taskId,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true },
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    }
    return next(err);
  }

  res.status(200).json(updatedTask);
}

/**
 * Deletes a task owned by the logged-in user
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function deleteTask(req, res, next) {
  const taskId = parseTaskId(req.params?.id);
  if (Number.isNaN(taskId)) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  let deletedTask = null;
  try {
    deletedTask = await prisma.task.delete({
      where: {
        id: taskId,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true },
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    }
    return next(err);
  }

  res.status(200).json(deletedTask);
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
