import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

// Base route is /api/settings
router.get('/', protect, getSettings);
router.patch('/', protect, updateSettings);

export default router;
