const express = require('express');
const { logon, register, logoff } = require('../controllers/userController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

const router = express.Router();

router.post('/logon', logon);
router.post('/register', register);
router.post('/logoff', jwtMiddleware, logoff);

module.exports = router;