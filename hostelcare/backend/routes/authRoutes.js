const express = require('express');
const { register, login, logout, me, updateProfile, getRegistrationOptions } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.get('/registration-options', getRegistrationOptions);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.patch('/profile', requireAuth, updateProfile);

module.exports = router;
