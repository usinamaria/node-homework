const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const { paginationSchema } = require("../validation/paginationSchema");
const prisma = require("../db/prisma");

function parseTaskId(rawId) {
  if (!/^\d+$/.test(rawId ?? "")) {
    return NaN;
  }
  return Number(rawId);
}

function getOrderBy(query) {
  const validSortFields = ["title", "priority", "createdAt", "id", "isCompleted"];
  const sortBy = query.sortBy || "createdAt";
  const sortDirection = query.sortDirection === "asc" ? "asc" : "desc";

  if (validSortFields.includes(sortBy)) {
    return { [sortBy]: sortDirection };
  }
  return { createdAt: "desc" };
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
        priority: value.priority,
        userId: req.user.id,
      },
      select: { id: true, title: true, isCompleted: true, priority: true },
    });
  } catch (e) {
    return next(e);
  }

  res.status(201).json(task);
}

/**
 * Creates multiple tasks owned by the logged-in user in one batch
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function bulkCreate(req, res, next) {
  if (!req.body) req.body = {};
  const { tasks } = req.body;

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }

  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details,
      });
    }
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || "medium",
      userId: req.user.id,
    });
  }

  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false,
    });

    res.status(201).json({
      message: "Bulk task creation successful",
      tasksCreated: result.count,
      totalRequested: validTasks.length,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Lists the logged-in user's tasks
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function index(req, res, next) {
  const { error: paginationError, value: paginationValue } = paginationSchema.validate({
    page: req.query.page,
    limit: req.query.limit,
  });
  if (paginationError) {
    return res.status(400).json({ message: paginationError.message });
  }
  const { page, limit } = paginationValue;
  const skip = (page - 1) * limit;

  const whereClause = { userId: req.user.id };
  if (req.query.find) {
    whereClause.title = {
      contains: req.query.find,
      mode: "insensitive",
    };
  }

  if (req.query.isCompleted === "true" || req.query.isCompleted === "false") {
    whereClause.isCompleted = req.query.isCompleted === "true";
  }

  if (["low", "medium", "high"].includes(req.query.priority)) {
    whereClause.priority = req.query.priority;
  }

  const minDate = req.query.min_date ? new Date(req.query.min_date) : null;
  const maxDate = req.query.max_date ? new Date(req.query.max_date) : null;
  if ((minDate && !Number.isNaN(minDate.getTime())) || (maxDate && !Number.isNaN(maxDate.getTime()))) {
    whereClause.createdAt = {};
    if (minDate && !Number.isNaN(minDate.getTime())) {
      whereClause.createdAt.gte = minDate;
    }
    if (maxDate && !Number.isNaN(maxDate.getTime())) {
      whereClause.createdAt.lte = maxDate;
    }
  }

  let tasks = null;
  let total = null;
  try {
    tasks = await prisma.task.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: getOrderBy(req.query),
    });
    total = await prisma.task.count({
      where: whereClause,
    });
  } catch (e) {
    return next(e);
  }

  const pages = Math.ceil(total / limit);
  const pagination = {
    page,
    limit,
    total,
    pages,
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };

  res.status(200).json({ tasks, pagination });
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
        userId: req.user.id,
      },
      select: { title: true, isCompleted: true, priority: true, id: true },
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
        userId: req.user.id,
      },
      select: { title: true, isCompleted: true, priority: true, id: true },
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
        userId: req.user.id,
      },
      select: { title: true, isCompleted: true, priority: true, id: true },
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
  bulkCreate,
  index,
  show,
  update,
  deleteTask,
};
