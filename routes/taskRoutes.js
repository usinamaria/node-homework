const express = require("express");
const {
  create,
  bulkCreate,
  bulkUpdateByIds,
  bulkDeleteByIds,
  index,
  updateByFilter,
  deleteByFilter,
  show,
  update,
  deleteTask,
  addLog,
} = require("../controllers/taskController");

const router = express.Router();

/**
 * @openapi
 * /api/tasks:
 *   get:
 *     summary: List the logged-in user's tasks
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: find
 *         schema: { type: string }
 *         description: Case-insensitive substring match on task title.
 *       - in: query
 *         name: isCompleted
 *         schema: { type: string, enum: [true, false] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high] }
 *       - in: query
 *         name: min_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: max_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [title, priority, createdAt, id, isCompleted], default: createdAt }
 *       - in: query
 *         name: sortDirection
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: A page of tasks.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: No user is authenticated.
 *       404:
 *         description: No tasks were found.
 *   post:
 *     summary: Create a task
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *         csrfHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string, minLength: 3, maxLength: 30, example: Buy groceries }
 *               isCompleted: { type: boolean, default: false }
 *               priority: { type: string, enum: [low, medium, high], default: medium }
 *     responses:
 *       201:
 *         description: Task created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No user is authenticated.
 *   patch:
 *     summary: Bulk-update all of the logged-in user's tasks matching a filter
 *     description: >
 *       Updates every task matching the given filter query parameters (the same
 *       filters accepted by GET /api/tasks). At least one filter parameter is required.
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *         csrfHeader: []
 *     parameters:
 *       - in: query
 *         name: find
 *         schema: { type: string }
 *       - in: query
 *         name: isCompleted
 *         schema: { type: string, enum: [true, false] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high] }
 *       - in: query
 *         name: min_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: max_date
 *         schema: { type: string, format: date }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: At least one attribute must be provided.
 *             properties:
 *               title: { type: string, minLength: 3, maxLength: 30 }
 *               isCompleted: { type: boolean }
 *               priority: { type: string, enum: [low, medium, high] }
 *     responses:
 *       200:
 *         description: Update counts.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 tasksUpdated: { type: integer }
 *       400:
 *         description: Validation failed, or no filter query parameter was supplied.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No user is authenticated.
 *   delete:
 *     summary: Bulk-delete all of the logged-in user's tasks matching a filter
 *     description: >
 *       Deletes every task matching the given filter query parameters (the same
 *       filters accepted by GET /api/tasks). At least one filter parameter is required.
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *         csrfHeader: []
 *     parameters:
 *       - in: query
 *         name: find
 *         schema: { type: string }
 *       - in: query
 *         name: isCompleted
 *         schema: { type: string, enum: [true, false] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high] }
 *       - in: query
 *         name: min_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: max_date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Delete counts.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 tasksDeleted: { type: integer }
 *       400:
 *         description: No filter query parameter was supplied.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No user is authenticated.
 */
router.get("/", index);
router.post("/", create);
router.patch("/", updateByFilter);
router.delete("/", deleteByFilter);

/**
 * @openapi
 * /api/tasks/bulk:
 *   post:
 *     summary: Create multiple tasks in one batch
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *         csrfHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tasks]
 *             properties:
 *               tasks:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [title]
 *                   properties:
 *                     title: { type: string, minLength: 3, maxLength: 30 }
 *                     isCompleted: { type: boolean, default: false }
 *                     priority: { type: string, enum: [low, medium, high], default: medium }
 *     responses:
 *       201:
 *         description: Tasks created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: Bulk task creation successful }
 *                 tasksCreated: { type: integer }
 *                 totalRequested: { type: integer }
 *       400:
 *         description: Invalid request data or validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No user is authenticated.
 *   patch:
 *     summary: Bulk-update tasks by id
 *     description: Updates every task in the given id array that belongs to the logged-in user.
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *         csrfHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             description: At least one of title, isCompleted, or priority must also be provided.
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: integer }
 *                 example: [1, 2, 3]
 *               title: { type: string, minLength: 3, maxLength: 30 }
 *               isCompleted: { type: boolean }
 *               priority: { type: string, enum: [low, medium, high] }
 *     responses:
 *       200:
 *         description: Update counts.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 tasksUpdated: { type: integer }
 *       400:
 *         description: Validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No user is authenticated.
 *   delete:
 *     summary: Bulk-delete tasks by id
 *     description: Deletes every task in the given id array that belongs to the logged-in user.
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *         csrfHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: integer }
 *                 example: [1, 2, 3]
 *     responses:
 *       200:
 *         description: Delete counts.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 tasksDeleted: { type: integer }
 *       400:
 *         description: Validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No user is authenticated.
 */
router.post("/bulk", bulkCreate);
router.patch("/bulk", bulkUpdateByIds);
router.delete("/bulk", bulkDeleteByIds);

/**
 * @openapi
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a single task owned by the logged-in user
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: include
 *         schema: { type: string, enum: [logs] }
 *         description: Pass "logs" to include the task's progress log entries.
 *     responses:
 *       200:
 *         description: The task.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: The task ID passed is not valid.
 *       401:
 *         description: No user is authenticated.
 *       404:
 *         description: The task was not found.
 *   patch:
 *     summary: Update a task owned by the logged-in user
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *         csrfHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: At least one attribute must be provided.
 *             properties:
 *               title: { type: string, minLength: 3, maxLength: 30 }
 *               isCompleted: { type: boolean }
 *               priority: { type: string, enum: [low, medium, high] }
 *     responses:
 *       200:
 *         description: The updated task.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation failed or the task ID passed is not valid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No user is authenticated.
 *       404:
 *         description: The task was not found.
 *   delete:
 *     summary: Delete a task owned by the logged-in user
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *         csrfHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: The deleted task.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: The task ID passed is not valid.
 *       401:
 *         description: No user is authenticated.
 *       404:
 *         description: The task was not found.
 */
router.get("/:id", show);
router.patch("/:id", update);
router.delete("/:id", deleteTask);

/**
 * @openapi
 * /api/tasks/{id}/logs:
 *   post:
 *     summary: Add a progress log entry to a task owned by the logged-in user
 *     tags: [Tasks]
 *     security:
 *       - cookieAuth: []
 *         csrfHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 maxLength: 255
 *                 example: Started researching the API design.
 *     responses:
 *       201:
 *         description: The created log entry.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Log'
 *       400:
 *         description: Validation failed or the task ID passed is not valid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No user is authenticated.
 *       404:
 *         description: The task was not found.
 */
router.post("/:id/logs", addLog);

module.exports = router;
