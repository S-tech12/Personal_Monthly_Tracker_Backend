import { Router } from 'express';
import { sendCurrentMonthReport, sendVoiceRequestedReport } from '../controllers/report.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/current-month', protect, sendCurrentMonthReport);
router.post('/voice-request', protect, sendVoiceRequestedReport);

export default router;
