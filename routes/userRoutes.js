const express = require('express');
const { logon, register, googleLogon, logoff } = require('../controllers/userController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

const router = express.Router();

/**
 * @openapi
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a user account, seeds three welcome tasks, and logs the user in by setting a JWT cookie.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 example: Jane Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Min 8 characters; must include upper and lower case letters, a number, and a special character.
 *                 example: Str0ng!Pass
 *               recaptchaToken:
 *                 type: string
 *                 description: reCAPTCHA token used for bot verification.
 *     responses:
 *       201:
 *         description: User registered and logged in.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 csrfToken:
 *                   type: string
 *                 welcomeTasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *                 transactionStatus:
 *                   type: string
 *                   example: success
 *       400:
 *         description: Validation failed, bot verification failed, or email already registered.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', register);

/**
 * @openapi
 * /api/users/logon:
 *   post:
 *     summary: Log in an existing user
 *     description: Verifies credentials and sets a JWT cookie for subsequent authenticated requests.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Str0ng!Pass
 *     responses:
 *       200:
 *         description: Login successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 csrfToken:
 *                   type: string
 *       400:
 *         description: Validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid email or password.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logon', logon);

/**
 * @openapi
 * /api/users/googleLogon:
 *   post:
 *     summary: Log in (or register) via Google OAuth
 *     description: >
 *       Exchanges a Google OAuth authorization code obtained by the front end for the
 *       user's Google identity, finds or creates a matching user record, and sets a
 *       JWT cookie for subsequent authenticated requests.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 description: >
 *                   The authorization code returned by Google's OAuth consent flow
 *                   (this is the field name the class's sample front end sends;
 *                   `authorizationCode` is also accepted as an alias).
 *     responses:
 *       200:
 *         description: Login successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 csrfToken:
 *                   type: string
 *       400:
 *         description: code (or authorizationCode) was not supplied.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Google could not verify the authorization code.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/googleLogon', googleLogon);

/**
 * @openapi
 * /api/users/logoff:
 *   post:
 *     summary: Log off the current user
 *     description: Clears the JWT cookie, ending the session.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *         csrfHeader: []
 *     responses:
 *       200:
 *         description: Logged off successfully.
 *       401:
 *         description: No user is authenticated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logoff', jwtMiddleware, logoff);

module.exports = router;
