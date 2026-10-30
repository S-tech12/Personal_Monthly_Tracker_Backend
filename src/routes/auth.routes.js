import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/verify-signup-otp', authController.verifySignupOtp);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', protect, authController.getCurrentUser);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.patch('/update-password', protect, authController.updatePassword);
router.delete('/delete-account', protect, authController.deleteAccount);

export default router;
