import express from 'express';
import authRoutes from './auth.routes.js';
import expenseRoutes from './expense.routes.js';
import settingsRoutes from './settings.routes.js';
import budgetRoutes from './budget.routes.js';
import reportRoutes from './report.routes.js';
import familyRoutes from './family.routes.js';
import voiceCommandRoutes from './voiceCommand.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/expenses', expenseRoutes);
router.use('/settings', settingsRoutes);

// Other routes will be mounted here later
router.use('/budgets', budgetRoutes);
router.use('/reports', reportRoutes);
router.use('/family', familyRoutes);
router.use('/voice-command', voiceCommandRoutes);

export default router;
