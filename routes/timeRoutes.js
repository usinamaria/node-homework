const express = require("express");
const timeController = require("../controllers/timeController");

const router = express.Router();

/**
 * @openapi
 * /api/time:
 *   get:
 *     summary: Get the current server time
 *     tags: [Utility]
 *     responses:
 *       200:
 *         description: Current server time.
 */
router.get("/time", timeController.getTime);

/**
 * @openapi
 * /api/echo:
 *   post:
 *     summary: Echo the request body back to the caller
 *     tags: [Utility]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: The request body, echoed back.
 */
router.post("/echo", timeController.echoBody);

module.exports = router;
