const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const pool = require("../db/pg-pool");

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
    task = await pool.query(
      `INSERT INTO tasks (title, is_completed, user_id)
      VALUES ($1, $2, $3) RETURNING id, title, is_completed`,
      [value.title, value.isCompleted, global.user_id],
    );
  } catch (e) {
    return next(e);
  }

  res.status(201).json(task.rows[0]);
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
    tasks = await pool.query(
      "SELECT id, title, is_completed FROM tasks WHERE user_id = $1",
      [global.user_id],
    );
  } catch (e) {
    return next(e);
  }

  if (tasks.rows.length === 0) {
    return res.status(404).json({ message: "No tasks found for user" });
  }

  res.status(200).json(tasks.rows);
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
    task = await pool.query(
      "SELECT id, title, is_completed FROM tasks WHERE id = $1 AND user_id = $2",
      [taskId, global.user_id],
    );
  } catch (e) {
    return next(e);
  }

  if (task.rows.length === 0) {
    return res.status(404).json({ message: "Task not found" });
  }

  res.status(200).json(task.rows[0]);
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

  let keys = Object.keys(value);
  keys = keys.map((key) => (key === "isCompleted" ? "is_completed" : key));
  const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
  const idParm = `$${keys.length + 1}`;
  const userParm = `$${keys.length + 2}`;

  let updatedTask = null;
  try {
    updatedTask = await pool.query(
      `UPDATE tasks SET ${setClauses}
      WHERE id = ${idParm} AND user_id = ${userParm} RETURNING id, title, is_completed`,
      [...Object.values(value), taskId, global.user_id],
    );
  } catch (e) {
    return next(e);
  }

  if (updatedTask.rows.length === 0) {
    return res.status(404).json({ message: "Task not found" });
  }

  res.status(200).json(updatedTask.rows[0]);
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
    deletedTask = await pool.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id, title, is_completed",
      [taskId, global.user_id],
    );
  } catch (e) {
    return next(e);
  }

  if (deletedTask.rows.length === 0) {
    return res.status(404).json({ message: "Task not found" });
  }

  res.status(200).json(deletedTask.rows[0]);
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
