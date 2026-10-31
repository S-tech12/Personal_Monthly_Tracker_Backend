import { createExpenseFromVoice, parseExpensesFromVoice, createExpenses, getExpensesByDate, getExpenseSummary, getCategoryBreakdown as getCategoryBreakdownService, getRecentExpenses, getCurrentMonthExpenses, getCurrentWeekExpenses } from '../services/expense.service.js';


// this function is used to create and store the expenses into the database..
export const createFromVoice = async (req, res, next) => {
  try {

    // first it will fetch the data from the request 
    let { transcript } = req.body;
    const errors = {};


    // then it validate the transcript 
    if (transcript === undefined || transcript === null) {
      errors.transcript = 'Transcript is required';
    } else if (typeof transcript !== 'string') {
      errors.transcript = 'Transcript must be a string';
    } else if (transcript.trim() === '') {
      errors.transcript = 'Transcript cannot be empty';
    } else if (transcript.length > 500) {
      errors.transcript = 'Transcript exceeds maximum allowed length of 500 characters';
    } else {
      transcript = transcript.trim();
      req.body.transcript = transcript;
    }

    // then it will check that is there any error or not ?? if yes then it will return the response from here...
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: errors
      });
    }

    // this function is responsible to create the expenses and store in the database this is the main function
    const transactions = await createExpenseFromVoice(req.user._id, transcript);
    const expenses = transactions.filter(transaction => transaction.type !== 'Credit');
    const incomes = transactions.filter(transaction => transaction.type === 'Credit');

    return res.status(201).json({
      success: true,
      message: `${transactions.length} transaction${transactions.length > 1 ? 's' : ''} added successfully`,
      data: { expenses, incomes }
    });
  } catch (error) {
    console.error('[DEBUG Controller Error]:', error);

    if (error.statusCode === 503) {
      return res.status(503).json({ success: false, message: error.message });
    }
    
    // If it's a parsing error from gemini service, return 400
    if (error.message && (error.message.includes('Could not understand') || error.message.includes('Failed to parse'))) {
      return res.status(400).json({ success: false, message: error.message });
    }
    
    // Otherwise pass to global error handler
    next(error);
  }
};

export const parseFromVoice = async (req, res, next) => {
  try {
    const { transcript } = req.body;
    if (typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ success: false, message: 'Transcript is required' });
    }
    const transactions = await parseExpensesFromVoice(req.user._id, transcript.trim());
    const expenses = transactions.filter(transaction => transaction.type !== 'Credit');
    const incomes = transactions.filter(transaction => transaction.type === 'Credit');
    return res.status(200).json({ success: true, data: { expenses, incomes } });
  } catch (error) {
    if (error.statusCode === 503) {
      return res.status(503).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const createBulk = async (req, res, next) => {
  try {
    const { expenses } = req.body;
    if (!Array.isArray(expenses) || expenses.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one expense is required' });
    }
    const savedExpenses = await createExpenses(req.user._id, expenses, 'manual');
    return res.status(201).json({ success: true, message: `${savedExpenses.length} expenses added successfully`, data: { expenses: savedExpenses } });
  } catch (error) {
    next(error);
  }
};


// 
export const getByDate = async (req, res, next) => {
  try {

    // first fetch the date from the request 
    let { date } = req.query;
    const errors = {};

    // here the validation will be done
    if (date !== undefined && date !== null) {
      if (typeof date !== 'string') {
        errors.date = 'Date must be a string';
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        errors.date = 'Date must be in YYYY-MM-DD format';
      }
    }

    // if the errors are here then it will be returned from here.
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: errors
      });
    }

    // i think this is unusefull because if there is no any date then we are already sending the response so it is not such a usefull function
    if (!date) {
      const today = new Date();
      // Format as YYYY-MM-DD
      date = today.toISOString().split('T')[0];
    }

    // now this is the main function that will fetch the documents from the database based on the date...
    const expenses = await getExpensesByDate(req.user._id, date);

    return res.status(200).json({
      success: true,
      data: { expenses, date }
    });
  } catch (error) {
    console.error('[DEBUG Controller Error - getByDate]:', error);
    next(error);
  }
};

// this function is responsible to get the expenses for that current month
export const getSummary = async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const summary = await getExpenseSummary(req.user._id);

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('[DEBUG Controller Error - getSummary]:', error);
    next(error);
  }
};

// this function is to get the idea about the category wise and currency wise total breakdown
export const getCategoryBreakdown = async (req, res, next) => {
  try {
    const breakdown = await getCategoryBreakdownService(req.user._id);
    return res.status(200).json({
      success: true,
      data: { breakdown }
    });
  } catch (error) {
    next(error);
  }
};

// this function is used to get the recent expenses from the family
export const getRecent = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const expenses = await getRecentExpenses(req.user._id, limit);
    return res.status(200).json({
      success: true,
      data: { expenses }
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentMonth = async (req, res, next) => {
  try {
    const expenses = await getCurrentMonthExpenses(req.user._id);
    return res.status(200).json({ success: true, data: { expenses } });
  } catch (error) {
    next(error);
  }
};

export const getCurrentWeek = async (req, res, next) => {
  try {
    const expenses = await getCurrentWeekExpenses(req.user._id);
    return res.status(200).json({ success: true, data: { expenses } });
  } catch (error) {
    next(error);
  }
};
