import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { handleVoiceCommand } from '../controllers/voiceCommand.controller.js';

const router = express.Router();

router.use(protect);

// so this is the main route where the command will be distigused when we speak.
router.post(
  '/',
  handleVoiceCommand
);

export default router;
