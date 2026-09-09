const express = require("express");
const {
  getUserAnalytics,
  getUsersWithStats,
  searchTasks,
} = require("../controllers/analyticsController");

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Analytics
 *   description: Aggregate stats and search across users and tasks. All routes require authentication and the "manager" role.
 */

/**
 * @openapi
 * /api/analytics/users/{id}:
 *   get:
 *     summary: Get task completion stats and recent activity for a user
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Task stats, recent tasks, and weekly progress.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 taskStats:
 *                   type: array
 *                   items: { type: object }
 *                 recentTasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *                 weeklyProgress:
 *                   type: array
 *                   items: { type: object }
 *       400:
 *         description: The user ID passed is not valid.
 *       401:
 *         description: No user is authenticated, or the authenticated user does not have the manager role.
 *       404:
 *         description: The user was not found.
 */
router.get("/users/:id", getUserAnalytics);

/**
 * @openapi
 * /api/analytics/users:
 *   get:
 *     summary: List all users with their task counts
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *     responses:
 *       200:
 *         description: A page of users with stats.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: No user is authenticated, or the authenticated user does not have the manager role.
 */
router.get("/users", getUsersWithStats);

/**
 * @openapi
 * /api/analytics/tasks/search:
 *   get:
 *     summary: Search tasks and user names with relevance ranking
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 2 }
 *         description: Search term matched against task titles and user names.
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Matching results ranked by relevance.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items: { type: object }
 *                 query: { type: string }
 *                 count: { type: integer }
 *       400:
 *         description: Search query must be at least 2 characters long, or limit is out of range.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No user is authenticated, or the authenticated user does not have the manager role.
 */
router.get("/tasks/search", searchTasks);

module.exports = router;
