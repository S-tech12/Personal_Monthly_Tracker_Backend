import * as budgetService from '../services/budget.service.js';

// it is just simply calling the service in which we need to pass the user's mongoDB id and then we need to return the data
export const getBudgetOverview = async (req, res, next) => {
  try {
    const overview = await budgetService.getBudgetOverview(req.user._id);
    res.json({ success: true, data: overview });
  } catch (error) {
    next(error);
  }
};

// this function is basically to set the limit for the currency
export const setOverallLimit = async (req, res, next) => {
  try {

    // first fetch the currency and limit from the incoming request
    const { currency, limit } = req.body;
    const errors = {};

    if (currency === undefined || currency === null || typeof currency !== 'string' || currency.length !== 3) {
      errors.currency = 'Currency must be a 3-letter code';
    }

    const parsedLimit = parseFloat(limit);
    if (limit === undefined || limit === null || isNaN(parsedLimit) || parsedLimit < 0) {
      errors.limit = 'Limit must be a positive number';
    } else {
      req.body.limit = parsedLimit;
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: errors
      });
    }

    // then this function is execute to set the overall limit for the current loggedIn user id 
    const limits = await budgetService.setOverallLimit(req.user._id, req.body);
    res.json({ success: true, message: 'Overall budget limit updated', data: { overallMonthlyLimits: limits } });
  } catch (error) {
    if (error.message.includes('Only the head')) {
      error.status = 403;
    }
    next(error);
  }
};

// this function is to update category budget
export const upsertCategoryBudget = async (req, res, next) => {
  try {
    // first fetch the data from request body
    const { category, categoryId, type, month, year, monthlyLimit, currency } = req.body;
    const errors = {};

    if (!categoryId && (category === undefined || category === null || typeof category !== 'string' || category.trim() === '')) {
      errors.category = 'Category is required';
    } else if (category) {
      req.body.category = category.trim();
    }
    if (type !== undefined && !['Credit', 'Debit'].includes(type)) errors.type = 'Type must be Credit or Debit';
    if (month !== undefined && month !== null && (!Number.isInteger(Number(month)) || Number(month) < 1 || Number(month) > 12)) errors.month = 'Month must be between 1 and 12';
    if (year !== undefined && year !== null && (!Number.isInteger(Number(year)) || Number(year) < 2000)) errors.year = 'Year is invalid';

    const parsedMonthlyLimit = parseFloat(monthlyLimit);
    if (monthlyLimit === undefined || monthlyLimit === null || isNaN(parsedMonthlyLimit) || parsedMonthlyLimit < 0) {
      errors.monthlyLimit = 'Monthly limit must be a positive number';
    } else {
      req.body.monthlyLimit = parsedMonthlyLimit;
    }

    if (currency === undefined || currency === null || typeof currency !== 'string' || currency.length !== 3) {
      errors.currency = 'Currency must be a 3-letter code';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: errors
      });
    }

    // this is the function which update the category budget..
    const budget = await budgetService.upsertCategoryBudget(req.user._id, { ...req.body, month: month == null ? null : Number(month), year: year == null ? null : Number(year) });
    res.json({ success: true, message: 'Budget category saved', data: { budget } });
  } catch (error) {
    if (error.message.includes('Only the head')) {
      error.status = 403;
    }
    next(error);
  }
};
