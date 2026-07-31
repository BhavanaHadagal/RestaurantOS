const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authRateLimiter } = require('../middleware/rateLimiter');
const {
  loginValidator,
  signupValidator,
  refreshValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
} = require('../validators/authValidator');

router.post('/signup', authRateLimiter, signupValidator, validate, authController.register);
router.post('/login', authRateLimiter, loginValidator, validate, authController.login);
router.post('/refresh', refreshValidator, validate, authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', forgotPasswordValidator, validate, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidator, validate, authController.resetPassword);
router.post('/change-password', authenticate, changePasswordValidator, validate, authController.changePassword);
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
