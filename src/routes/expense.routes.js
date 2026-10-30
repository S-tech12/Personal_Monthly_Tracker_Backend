import { Router } from 'express';
import { createFromVoice, parseFromVoice, createBulk, getByDate, getSummary, getCategoryBreakdown, getRecent } from '../controllers/expense.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

// Base route is /api/expenses

// so this route is responsible for to create and add the expenses into the database from the voice...
router.post('/voice', protect, createFromVoice);
router.post('/voice/parse', protect, parseFromVoice);
router.post('/bulk', protect, createBulk);

// so this route is responsible to get the expenses for date..
router.get('/by-date', protect, getByDate);

// this route is responsible to get the expenses for that current month
router.get('/summary', protect, getSummary);

// this route is to get the idea about the category wise and currency wise total breakdown
router.get('/category-breakdown', protect, getCategoryBreakdown);


// ok so this route is used to fetch the recent expenses from the family
router.get('/recent', protect, getRecent);

export default router;
