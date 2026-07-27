const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

function sanitizeTask(task) {
  const { userId, ...sanitizedTask } = task;
  return sanitizedTask;
}

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
 */
function create(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = taskSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const newTask = {
    id: taskCounter(),
    userId: global.user_id.email,
    ...value,
  };

  global.tasks.push(newTask);

  res.status(201).json(sanitizeTask(newTask));
}

/**
 * Lists the logged-in user's tasks
 * @param {*} req
 * @param {*} res
 */
function index(req, res) {
  const tasks = global.tasks.filter(
    (task) => task.userId === global.user_id.email,
  );

  if (tasks.length === 0) {
    return res.status(404).json({ message: "No tasks found for user" });
  }

  res.status(200).json(tasks.map(sanitizeTask));
}

/**
 * Shows a single task owned by the logged-in user
 * @param {*} req
 * @param {*} res
 */
function show(req, res) {
  const taskId = parseTaskId(req.params?.id);
  if (Number.isNaN(taskId)) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  const task = global.tasks.find(
    (task) => task.id === taskId && task.userId === global.user_id.email,
  );

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  res.status(200).json(sanitizeTask(task));
}

/**
 * Updates a task owned by the logged-in user
 * @param {*} req
 * @param {*} res
 */
function update(req, res) {
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

  const task = global.tasks.find(
    (task) => task.id === taskId && task.userId === global.user_id.email,
  );

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  Object.assign(task, value);

  res.status(200).json(sanitizeTask(task));
}

/**
 * Deletes a task owned by the logged-in user
 * @param {*} req
 * @param {*} res
 */
function deleteTask(req, res) {
  const taskId = parseTaskId(req.params?.id);
  if (Number.isNaN(taskId)) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  const taskIndex = global.tasks.findIndex(
    (task) => task.id === taskId && task.userId === global.user_id.email,
  );

  if (taskIndex === -1) {
    return res.status(404).json({ message: "Task not found" });
  }

  const [deletedTask] = global.tasks.splice(taskIndex, 1);

  res.status(200).json(sanitizeTask(deletedTask));
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
