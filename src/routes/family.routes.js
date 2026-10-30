import express from 'express';
import { familyController } from '../controllers/family.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

// this route is useful for to sent the invitation to the family memeber from the head of the family.
router.post('/invite', familyController.sendInvite);

// this route is responsible to respond to the invitation which comes from the family member
router.patch('/respond', familyController.respondToInvite);

// 
router.get('/overview', familyController.getOverview);
router.get('/invites/pending', familyController.getPendingInvites);
router.get('/invites/sent', familyController.getSentInvites);

export default router;
