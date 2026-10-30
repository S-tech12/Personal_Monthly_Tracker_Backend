import express from 'express';
import {protect}  from '../middlewares/auth.middleware.js';
import * as budgetController from '../controllers/budget.controller.js';

const router = express.Router();

router.use(protect);

// it will fetch the overall budget based on the loggedIn userId
router.get('/', budgetController.getBudgetOverview);

// this route is to set or update the overAllLimit(currencywise)
router.patch('/overall-limit', budgetController.setOverallLimit);

// this route is to update the category budget.
router.post('/category', budgetController.upsertCategoryBudget);

export default router;
